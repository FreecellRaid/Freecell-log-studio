<template>
    <div
        class="view"
        :data-focus-id="effectiveWindowId"
        :class="{ 'is-active': windowStore.activeFocus === props.chunkId }"
        @pointerdown="windowStore.setFocus(props.chunkId)"
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
                    v-if="windowStore.splitMode === 'single'"
                    class="view-action-btn"
                    title="向右分屏"
                    @click.stop="handleSplit"
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>

                <button
                    v-if="windowStore.splitMode === 'double' || canClose"
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
                <div
                    v-for="(msg, index) in messages"
                    :key="msg.messageId"
                    class="message-slot"
                >
                    <div
                        v-if="
                            dropIndicatorIndex === index &&
                            dragDropTool.isDragging.value
                        "
                        class="drop-indicator"
                    ></div>
                    <MessageItem
                        :message="msg"
                        :chunk-id="props.chunkId"
                        :index="index"
                        :is-selected="
                            filterTool.selectedMessageIds.value.has(
                                msg.messageId,
                            )
                        "
                        :is-active="isViewFocused"
                        @select="handleMessageSelect"
                        @dragstart="handleMessageDragStart"
                        @dragover="handleMessageDragOver($event, index)"
                        @drop="handleMessageDrop"
                        @dragend="handleDragEnd"
                        @action-insert="handleActionInsert(msg, index)"
                        @action-merge="handleActionMerge(msg)"
                        @action-split="handleActionSplit(msg.messageId)"
                        @action-delete="handleActionDelete(msg.messageId)"
                        @update-content="
                            (newContent) =>
                                handleUpdateContent(msg.messageId, newContent)
                        "
                    />
                </div>
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
import { computed, ref, onMounted } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useFilter } from '@/composables/useFilter';
import { useMessageDragDrop } from '@/composables/useDragDrop';
import MessageItem from '@/components/common/MessageItem.vue';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import { useChunkEditorStore } from '@/stores/editorStore/chunkStore';
import { useCommandDispatcher } from '@/composables/useCommandDispatcher';
import { useWindowStore } from '@/stores/windowStore';
import type { Message } from '@/types/log';

const props = defineProps<{
    chunkId: string;
    windowId?: string;
}>();
const effectiveWindowId = computed(() => props.windowId ?? props.chunkId);
const filterTool = useFilter(effectiveWindowId.value);
const dragDropTool = useMessageDragDrop();
const dropIndicatorIndex = ref<number | null>(null);
const logStore = useLogStore();
const windowStore = useWindowStore();
const messageEditorStore = useMessageEditorStore();
const chunkEditorStore = useChunkEditorStore();
const { dispatch } = useCommandDispatcher();

const canClose = computed(() => {
    return (
        windowStore.splitMode === 'single' &&
        effectiveWindowId.value !== 'defaultView' &&
        windowStore.openWindows.size > 1
    );
});

onMounted(() => {
    // 注册窗口时，显式传入 originalId
    // 将 split 窗口映射回原始 chunkId，从而共享选区
    windowStore.registerWindow({
        windowId: effectiveWindowId.value,
        windowName: 'chunkView',
        windowType: 'view',
        originalId: props.chunkId,
    });
});

function handleSplit() {
    windowStore.enterSplitMode('chunkView', props.chunkId);
}

function handleClose() {
    if (windowStore.splitMode === 'double') {
        windowStore.closePane();
    } else {
        windowStore.unregisterWindow(effectiveWindowId.value);
        // 如果还有其他打开的视图，聚焦到第一个可用的
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

const isViewFocused = computed(() => windowStore.activeFocus === props.chunkId);

const currentChunk = computed(function () {
    return logStore.findChunkById(props.chunkId) || undefined;
});

const messages = computed(function () {
    return currentChunk.value ? currentChunk.value.messages : [];
});

function handleMessageSelect(event: MouseEvent, msgId: string, index: number) {
    dispatch('select', {
        event,
        msgId,
        index,
        messages: messages.value,
    });
}

function handleUpdateContent(messageId: string, newContent: string) {
    messageEditorStore.updateMessage(props.chunkId, messageId, {
        content: newContent,
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
    messageEditorStore.insertNewMessageAfter(props.chunkId, msg, index);
}

function handleActionMerge(msg: Message) {
    const selectedIds = filterTool.selectedMessageIds.value;
    if (selectedIds.has(msg.messageId) && selectedIds.size > 1) {
        messageEditorStore.mergeMessages(
            props.chunkId,
            Array.from(selectedIds),
            msg.messageId,
        );
        filterTool.clearMessageSelection();
    } else {
        messageEditorStore.mergeWithNextMessage(props.chunkId, msg.messageId);
    }
}

function handleActionSplit(msgId: string) {
    chunkEditorStore.splitChunk(props.chunkId, msgId);
}

function handleActionDelete(msgId: string) {
    const selectedIds = filterTool.selectedMessageIds.value;
    if (selectedIds.has(msgId)) {
        messageEditorStore.batchDeleteMessages(selectedIds);
        filterTool.clearMessageSelection();
    } else {
        messageEditorStore.deleteMessage(props.chunkId, msgId);
    }
}
</script>

<style scoped>
.message-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0px 0px;
    position: relative;
    background-color: var(--bg-workspace);
}

.message-slot {
    position: relative;
}

.drop-indicator {
    position: relative;
    height: 0;
    border-top: 2px solid var(--active-accent);
    z-index: 1;
}
</style>
