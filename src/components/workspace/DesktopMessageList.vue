<template>
    <div
        class="message-list-container"
        @dragover.prevent="handleContainerDragOver"
        @drop.prevent="handleContainerDrop"
    >
        <template v-if="messages.length > 0">
            <DynamicScroller
                ref="scrollerRef"
                :items="messages"
                :min-item-size="95"
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
                            msg.images,
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
                            @action-insert="handleActionInsert(msg)"
                            @action-merge="handleActionMerge(msg)"
                            @action-split="handleActionSplit(msg.messageId)"
                            @action-delete="handleActionDelete(msg.messageId)"
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
            {{
                chunk.messages.length
                    ? '当前筛选下没有可见消息。'
                    : '该场景目前没有任何消息。'
            }}
            <template v-if="!chunk.messages.length">
                <br />
                可以从左侧其他场景中拖拽消息到此处。
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import MessageItem from '@/components/workspace/MessageItem.vue';
import { useActiveContext } from '@/composables/application/useActiveContext';
import { useMessageReveal } from '@/composables/application/useMessageReveal';
import { useMessageDragDrop } from '@/composables/interaction/useDragDrop';
import { useLogCommands } from '@/stores/project/logCommands';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import type { Chunk, Message } from '@/types/log';

const props = defineProps<{
    windowId: string;
    chunk: Chunk;
    messages: Message[];
}>();

const effectiveWindowId = computed(() => props.windowId);
const currentChunkId = computed(() => props.chunk.chunkId);
const currentChunk = computed(() => props.chunk);
const messages = computed(() => props.messages);

interface ScrollerInstance {
    scrollToItem: (index: number) => void;
    scrollToBottom: () => void;
    $el?: Element;
}

interface ScrollAnchor {
    scrollTop: number;
    scrollHeight: number;
}

const windowStore = useWindowStore();
const logCommands = useLogCommands();
const editorSessionStore = useEditorSessionStore();
const activeContext = useActiveContext(effectiveWindowId);
const dragDropTool = useMessageDragDrop(effectiveWindowId);

const isViewFocused = computed(
    () => windowStore.activeFocus === effectiveWindowId.value,
);

const scrollerRef = ref<ScrollerInstance | null>(null);

useMessageReveal({
    windowId: effectiveWindowId,
    messages,
    ready: () => Boolean(scrollerRef.value),
    reveal: (index) => {
        if (!scrollerRef.value) return false;
        scrollerRef.value.scrollToItem(index);
        return true;
    },
});

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

function handleMessageSelect(event: MouseEvent, msgId: string) {
    activeContext.handleMessageClickSelection(event, msgId, messages.value);
}

const editingMessageId = computed(() => {
    const target = editorSessionStore.activeTarget;
    return target?.kind === 'message' &&
        target.chunkId === currentChunkId.value &&
        editorSessionStore.editingWindowId === props.windowId
        ? target.messageId
        : null;
});
const editingContent = computed(
    () => editorSessionStore.messageDraft?.content ?? '',
);

function handleStartEdit(message: Message) {
    withScrollAnchor(() => {
        editorSessionStore.startEditing(
            {
                kind: 'message',
                chunkId: currentChunkId.value,
                messageId: message.messageId,
            },
            props.windowId,
        );
    });
}

function handleUpdateContent(value: string) {
    if (!editingMessageId.value) return;
    editorSessionStore.updateMessageDraft('content', value);
}

function handleSaveEdit(messageId: string) {
    if (editingMessageId.value !== messageId) return;
    withScrollAnchor(() => {
        const message = messages.value.find(
            (item) => item.messageId === messageId,
        );
        if (message && message.content !== editingContent.value) {
            logCommands.updateMessage(currentChunkId.value, messageId, {
                content: editingContent.value,
            });
        }
        editorSessionStore.stopEditing();
    });
}

function handleCancelEdit() {
    if (!editingMessageId.value) return;
    withScrollAnchor(() => {
        editorSessionStore.stopEditing();
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
    const targetMessage = messages.value[index];
    const rawIndex = currentChunk.value.messages.findIndex(
        (message) => message.messageId === targetMessage?.messageId,
    );
    if (rawIndex !== -1) dragDropTool.onDrop(event, chunkId, rawIndex);
}

function handleDragEnd() {
    dropIndicatorIndex.value = null;
    dragDropTool.onDragEnd();
}

function handleContainerDragOver(event: DragEvent) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.message-item')) {
        dropIndicatorIndex.value = null;
    }
    dragDropTool.onDragOver(event);
}

function handleContainerDrop(event: DragEvent) {
    const target = event.target;
    if (target instanceof Element && target.closest('.message-item')) {
        return;
    }

    dropIndicatorIndex.value = null;
    dragDropTool.onDrop(
        event,
        currentChunkId.value,
        currentChunk.value?.messages.length ?? 0,
    );
}

function handleActionInsert(message: Message) {
    logCommands.insertNewMessageAfter(currentChunkId.value, message);
}

function handleActionMerge(message: Message) {
    withScrollAnchor(() => {
        const visibleIds = messages.value.map((item) => item.messageId);
        const selectedIds = new Set(
            visibleIds.filter((id) =>
                activeContext.selectedMessageIds.value.has(id),
            ),
        );
        if (selectedIds.has(message.messageId) && selectedIds.size > 1) {
            logCommands.mergeMessages(
                currentChunkId.value,
                Array.from(selectedIds),
                message.messageId,
            );
            activeContext.clearMessageSelection();
            return;
        }

        logCommands.mergeWithNextMessage(
            currentChunkId.value,
            message.messageId,
            visibleIds,
        );
    });
}

function handleActionSplit(messageId: string) {
    logCommands.splitChunk(currentChunkId.value, messageId);
}

function handleActionDelete(messageId: string) {
    const selectedIds = activeContext.selectedMessageIds.value;

    if (selectedIds.has(messageId)) {
        logCommands.batchDeleteMessages(selectedIds);
        activeContext.clearMessageSelection();
        return;
    }

    logCommands.deleteMessage(currentChunkId.value, messageId);
}
</script>

<style scoped>
.message-list-container {
    min-height: 0;
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
