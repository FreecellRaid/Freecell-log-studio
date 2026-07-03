<template>
    <div
        class="view"
        :data-focus-id="effectiveWindowId"
        :class="{ 'is-active': windowStore.activeFocus === effectiveWindowId }"
        @pointerdown="windowStore.setFocus(effectiveWindowId)"
    >
        <header class="view-header">
            <div class="view-title">
                <FileText class="ui-icon icon-view-title" />
                <h2 class="text-view-title">
                    {{ currentChunk?.chunkName || '未知场景' }}
                </h2>
                <span class="msg-count">({{ messages.length }} 条消息)</span>
            </div>
            <div class="view-actions">
                <button
                    v-if="!windowStore.hasSplitView"
                    class="view-action-btn"
                    title="向右分屏"
                    @click.stop="handleSplit"
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>

                <button
                    class="view-action-btn"
                    title="关闭"
                    @click.stop="handleClose"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>

        <div
            class="message-list-container"
            @dragover.prevent="handleContainerDragOver"
            @drop.prevent="handleContainerDrop"
        >
            <template v-if="messages.length > 0">
                <DynamicScroller
                    ref="scrollerRef"
                    :items="messages"
                    :min-item-size="90"
                    key-field="messageId"
                    class="scroller"
                >
                    <template #default="{ item: msg, index, active }">
                        <DynamicScrollerItem
                            :item="msg"
                            :key="msg.messageId"
                            :active="active"
                            :size-dependencies="[
                                msg.content,
                                msg.messageId === editingMessageId,
                                msg.messageId === editingMessageId
                                    ? editingContent
                                    : null,
                            ]"
                            :data-index="index"
                            class="message-slot"
                            :class="{
                                'is-drop-target':
                                    dropIndicatorIndex === index &&
                                    dragDropTool.isDragging.value,
                            }"
                        >
                            <MessageItem
                                :message="msg"
                                :chunk-id="currentChunkId"
                                :index="index"
                                :is-selected="
                                    activeContext.selectedMessageIds.value.has(
                                        msg.messageId,
                                    )
                                "
                                :is-active="isViewFocused"
                                :is-editing="editingMessageId === msg.messageId"
                                :editing-content="editingContent"
                                @select="handleMessageSelect"
                                @dragstart="handleMessageDragStart"
                                @dragover="handleMessageDragOver($event, index)"
                                @drop="handleMessageDrop"
                                @dragend="handleDragEnd"
                                @action-insert="handleActionInsert(msg, index)"
                                @action-merge="handleActionMerge(msg)"
                                @action-split="handleActionSplit(msg.messageId)"
                                @action-delete="
                                    handleActionDelete(msg.messageId)
                                "
                                @start-edit="handleStartEdit"
                                @update-content="handleUpdateContent"
                                @save-edit="handleSaveEdit"
                                @cancel-edit="handleCancelEdit"
                            />
                        </DynamicScrollerItem>
                    </template>
                </DynamicScroller>
            </template>

            <div v-else class="view-empty-hint">
                该场景目前没有任何消息。
                <br />
                可以从左侧其他场景中拖拽消息到此处。
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FileText, SquareSplitHorizontal, X } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import MessageItem from '@/components/common/MessageItem.vue';
import { useActiveContext } from '@/composables/useActiveContext';
import { useCommandDispatcher } from '@/composables/useCommandDispatcher';
import { useMessageDragDrop } from '@/composables/useDragDrop';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Message } from '@/types/log';

const props = defineProps<{
    windowId: string;
    originalId: string;
}>();

const effectiveWindowId = computed(() => props.windowId);
const currentChunkId = computed(() => props.originalId);

interface ScrollerInstance {
    scrollToItem: (index: number) => void;
    scrollToBottom: () => void;
    $el?: Element;
}

interface ScrollAnchor {
    scrollTop: number;
    scrollHeight: number;
}

const logStore = useLogStore();
const uiStore = useUiStore();
const styleStore = useStyleStore();
const windowStore = useWindowStore();
const logEditorStore = useLogEditorStore();
const activeContext = useActiveContext(effectiveWindowId.value);
const dragDropTool = useMessageDragDrop();
const { dispatch } = useCommandDispatcher();

const currentChunk = computed(() =>
    logStore.findChunkById(currentChunkId.value),
);

const messages = computed(() => {
    if (!currentChunk.value) {
        return [];
    }

    if (uiStore.showHidden) {
        return currentChunk.value.messages;
    }

    const { hideOoc, hideCommand } = styleStore.viewSettings;
    return currentChunk.value.messages.filter((msg) => {
        const isMsgOoc = hideOoc && msg.isOoc;
        const isMsgCommand = hideCommand && msg.isCommand;
        return !(isMsgOoc || isMsgCommand);
    });
});

const isViewFocused = computed(
    () => windowStore.activeFocus === effectiveWindowId.value,
);

const scrollerRef = ref<ScrollerInstance | null>(null);

watch(
    () => windowStore.pendingMessageReveal,
    async (target) => {
        if (!target || target.chunkId !== currentChunkId.value) {
            return;
        }

        await nextTick();

        if (!scrollerRef.value || messages.value.length === 0) {
            return;
        }

        const index = messages.value.findIndex(
            (message) => message.messageId === target.messageId,
        );

        if (index !== -1) {
            scrollerRef.value.scrollToItem(index);
        }

        windowStore.clearPendingMessageReveal();
    },
    { flush: 'post', immediate: true },
);

function getScrollerElement() {
    const root = scrollerRef.value?.$el;
    return root instanceof HTMLElement ? root : null;
}

function captureScrollAnchor(): ScrollAnchor | null {
    const scrollerEl = getScrollerElement();
    if (!scrollerEl) {
        return null;
    }

    return {
        scrollTop: scrollerEl.scrollTop,
        scrollHeight: scrollerEl.scrollHeight,
    };
}

async function restoreScrollAnchor(anchor: ScrollAnchor | null) {
    if (!anchor) {
        return;
    }

    await nextTick();

    const scrollerEl = getScrollerElement();
    if (!scrollerEl) {
        return;
    }

    const heightDelta = scrollerEl.scrollHeight - anchor.scrollHeight;
    scrollerEl.scrollTop = Math.max(0, anchor.scrollTop + heightDelta);
}

function withScrollAnchor(action: () => void) {
    const anchor = captureScrollAnchor();
    action();
    void restoreScrollAnchor(anchor);
}

function handleSplit() {
    windowStore.openSplitView('chunkView', currentChunkId.value);
}

function handleClose() {
    if (windowStore.hasSplitView) {
        windowStore.closePane(effectiveWindowId.value);
        return;
    }

    windowStore.unregisterWindow(effectiveWindowId.value);

    const otherView = Array.from(windowStore.openWindows.values()).find(
        (win) =>
            win.windowType === 'view' &&
            win.windowId !== effectiveWindowId.value,
    );

    if (otherView) {
        windowStore.setFocus(otherView.windowId);
        return;
    }
    windowStore.setFocus('defaultView');
}

function handleMessageSelect(event: MouseEvent, msgId: string, index: number) {
    dispatch('select', {
        event,
        msgId,
        index,
        messages: messages.value,
    });
}

const editingMessageId = ref<string | null>(null);
const editingContent = ref('');

function handleStartEdit(message: Message) {
    withScrollAnchor(() => {
        editingMessageId.value = message.messageId;
        editingContent.value = message.content;
    });
}

function handleUpdateContent(value: string) {
    editingContent.value = value;
}

function handleSaveEdit(messageId: string) {
    withScrollAnchor(() => {
        const message = messages.value.find(
            (item) => item.messageId === messageId,
        );
        if (message && message.content !== editingContent.value) {
            logEditorStore.updateMessage(currentChunkId.value, messageId, {
                content: editingContent.value,
            });
        }
        editingMessageId.value = null;
    });
}

function handleCancelEdit() {
    withScrollAnchor(() => {
        editingMessageId.value = null;
    });
}

const dropIndicatorIndex = ref<number | null>(null);

function handleMessageDragStart(
    event: DragEvent,
    messageId: string,
    chunkId: string,
    index: number,
) {
    dropIndicatorIndex.value = index;
    dragDropTool.onDragStart(event, messageId, chunkId);
}

function handleMessageDragOver(event: DragEvent, index: number) {
    dropIndicatorIndex.value = index;
    dragDropTool.onDragOver(event);
}

function handleMessageDrop(event: DragEvent, chunkId: string, index: number) {
    dropIndicatorIndex.value = null;
    dragDropTool.onDrop(event, chunkId, index);
}

function handleDragEnd() {
    dropIndicatorIndex.value = null;
    dragDropTool.onDragEnd();
}

function handleContainerDragOver(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.message-item')) {
        dropIndicatorIndex.value = null;
    }
    dragDropTool.onDragOver(event);
}

function handleContainerDrop(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.message-item')) {
        return;
    }

    handleDragEnd();
}

function handleActionInsert(message: Message, index: number) {
    logEditorStore.insertNewMessageAfter(currentChunkId.value, message, index);
}

function handleActionMerge(message: Message) {
    withScrollAnchor(() => {
        const selectedIds = activeContext.selectedMessageIds.value;
        if (selectedIds.has(message.messageId) && selectedIds.size > 1) {
            logEditorStore.mergeMessages(
                currentChunkId.value,
                Array.from(selectedIds),
                message.messageId,
            );
            activeContext.clearMessageSelection();
            return;
        }

        logEditorStore.mergeWithNextMessage(
            currentChunkId.value,
            message.messageId,
        );
    });
}

function handleActionSplit(messageId: string) {
    logEditorStore.splitChunk(currentChunkId.value, messageId);
}

function handleActionDelete(messageId: string) {
    const selectedIds = activeContext.selectedMessageIds.value;

    if (selectedIds.has(messageId)) {
        logEditorStore.batchDeleteMessages(selectedIds);
        activeContext.clearMessageSelection();
        return;
    }

    logEditorStore.deleteMessage(currentChunkId.value, messageId);
}
</script>

<style scoped>
.message-list-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-anchor: none;
    padding: 0px 0px;
    position: relative;
    background-color: var(--bg-workspace);
}

.scroller {
    flex: 1;
    height: 100%;
    overflow-anchor: none;
}

.message-slot {
    position: relative;
}

.message-slot.is-drop-target::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    border-top: 2px solid var(--active-accent);
    pointer-events: none;
    z-index: 1;
}
</style>
