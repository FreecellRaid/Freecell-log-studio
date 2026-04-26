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
                    v-if="windowStore.hasSplitView || canClose"
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
                    :min-item-size="60"
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
import { FileText, X, SquareSplitHorizontal } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useUiStore } from '@/stores/uiStore';
import { useStyleStore } from '@/stores/styleStore';
import { useActiveContext } from '@/composables/useActiveContext';
import { useMessageDragDrop } from '@/composables/useDragDrop';
import MessageItem from '@/components/common/MessageItem.vue';
import { useLogEditorStore } from '@/stores/editorStore';
import { useCommandDispatcher } from '@/composables/useCommandDispatcher';
import { useWindowStore } from '@/stores/windowStore';
import type { Message } from '@/types/log';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const props = defineProps<{
    windowId: string;
    originalId: string;
}>();
const effectiveWindowId = computed(() => props.windowId);
const currentChunkId = computed(() => props.originalId);
const activeContext = useActiveContext(effectiveWindowId.value);
const dragDropTool = useMessageDragDrop();
const dropIndicatorIndex = ref<number | null>(null);
const uiStore = useUiStore();
const styleStore = useStyleStore();

interface ScrollerInstance {
    scrollToItem: (index: number) => void;
    scrollToBottom: () => void;
    $el?: Element;
}

const scrollerRef = ref<ScrollerInstance | null>(null);
const logStore = useLogStore();
const windowStore = useWindowStore();
const editingMessageId = ref<string | null>(null);
const editingContent = ref('');
const logEditorStore = useLogEditorStore();
const { dispatch } = useCommandDispatcher();

interface ScrollAnchor {
    scrollTop: number;
    scrollHeight: number;
}

const canClose = computed(() => {
    return (
        !windowStore.hasSplitView &&
        effectiveWindowId.value !== 'defaultView' &&
        windowStore.openWindows.size > 1
    );
});

function handleSplit() {
    windowStore.openSplitView('chunkView', currentChunkId.value);
}

function handleClose() {
    if (windowStore.hasSplitView) {
        windowStore.closePane(effectiveWindowId.value);
    } else {
        windowStore.unregisterWindow(effectiveWindowId.value);
        const otherView = Array.from(windowStore.openWindows.values()).find(
            (win) =>
                win.windowType === 'view' &&
                win.windowId !== effectiveWindowId.value,
        );
        if (otherView) {
            windowStore.setFocus(otherView.windowId);
        } else {
            windowStore.setFocus('defaultView');
        }
    }
}

const isViewFocused = computed(
    () => windowStore.activeFocus === effectiveWindowId.value,
);

const currentChunk = computed(function () {
    return logStore.findChunkById(currentChunkId.value) || undefined;
});

const messages = computed(() => {
    if (!currentChunk.value) return [];
    const allMessages = currentChunk.value.messages;
    if (uiStore.showHidden) {
        return allMessages;
    }
    const { hideOoc, hideCommand } = styleStore.viewSettings;

    return allMessages.filter((msg) => {
        const isMsgOoc = hideOoc && msg.isOoc;
        const isMsgCommand = hideCommand && msg.isCommand;
        return !(isMsgOoc || isMsgCommand);
    });
});

watch(
    () => windowStore.pendingMessageReveal,
    async (target) => {
        if (!target || target.chunkId !== currentChunkId.value) {
            return;
        }

        await nextTick();

        if (scrollerRef.value && messages.value.length > 0) {
            const index = messages.value.findIndex(
                (m) => m.messageId === target.messageId,
            );
            if (index !== -1) {
                scrollerRef.value.scrollToItem(index);
            }
        }

        windowStore.clearPendingMessageReveal();
    },
    { flush: 'post', immediate: true },
);

function handleMessageSelect(event: MouseEvent, msgId: string, index: number) {
    dispatch('select', {
        event,
        msgId,
        index,
        messages: messages.value,
    });
}

function handleStartEdit(message: Message) {
    withScrollAnchor(() => {
        editingMessageId.value = message.messageId;
        editingContent.value = message.content;
    });
}

function handleUpdateContent(val: string) {
    editingContent.value = val;
}

function handleSaveEdit(messageId: string) {
    withScrollAnchor(() => {
        const msg = messages.value.find((m) => m.messageId === messageId);
        if (msg && msg.content !== editingContent.value) {
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

// 拖拽逻辑兜底
function handleContainerDrop(event: DragEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.message-item')) {
        return;
    }
    // 放到空白区域时取消本次拖拽，不改变原有顺序
    handleDragEnd();
}

function handleActionInsert(msg: Message, index: number) {
    logEditorStore.insertNewMessageAfter(currentChunkId.value, msg, index);
}

function handleActionMerge(msg: Message) {
    withScrollAnchor(() => {
        const selectedIds = activeContext.selectedMessageIds.value;
        if (selectedIds.has(msg.messageId) && selectedIds.size > 1) {
            logEditorStore.mergeMessages(
                currentChunkId.value,
                Array.from(selectedIds),
                msg.messageId,
            );
            activeContext.clearMessageSelection();
        } else {
            logEditorStore.mergeWithNextMessage(
                currentChunkId.value,
                msg.messageId,
            );
        }
    });
}

function handleActionSplit(msgId: string) {
    logEditorStore.splitChunk(currentChunkId.value, msgId);
}

function handleActionDelete(msgId: string) {
    const selectedIds = activeContext.selectedMessageIds.value;
    if (selectedIds.has(msgId)) {
        logEditorStore.batchDeleteMessages(selectedIds);
        activeContext.clearMessageSelection();
    } else {
        logEditorStore.deleteMessage(currentChunkId.value, msgId);
    }
}

function getScrollerElement() {
    const root = scrollerRef.value?.$el;
    return root instanceof HTMLElement ? root : null;
}

function captureScrollAnchor(): ScrollAnchor | null {
    const scrollerEl = getScrollerElement();
    if (!scrollerEl) return null;

    return {
        scrollTop: scrollerEl.scrollTop,
        scrollHeight: scrollerEl.scrollHeight,
    };
}

async function restoreScrollAnchor(anchor: ScrollAnchor | null) {
    if (!anchor) return;

    await nextTick();

    const scrollerEl = getScrollerElement();
    if (!scrollerEl) return;

    const heightDelta = scrollerEl.scrollHeight - anchor.scrollHeight;
    scrollerEl.scrollTop = Math.max(0, anchor.scrollTop + heightDelta);
}

function withScrollAnchor(action: () => void) {
    const anchor = captureScrollAnchor();
    action();
    void restoreScrollAnchor(anchor);
}
</script>

<style scoped>
.message-list-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0px 0px;
    position: relative;
    background-color: var(--bg-workspace);
}

.scroller {
    flex: 1;
    height: 100%;
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
