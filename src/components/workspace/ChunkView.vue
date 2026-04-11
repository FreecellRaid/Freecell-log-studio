<template>
    <div
        class="view"
        :data-focus-id="props.chunkId"
        :class="{ 'is-active': uiStore.activeFocus.id === props.chunkId }"
        @pointerdown="uiStore.setFocus({ type: 'window', id: props.chunkId })"
    >
        <header class="view-header">
            <div class="view-title">
                <FileText class="ui-icon icon-view-title" />
                <h2>{{ currentChunk?.chunkName || '未知场景' }}</h2>
                <span class="msg-count">({{ messages.length }} 条消息)</span>
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
                        @toggleSelection="filterTool.toggleMessageSelection"
                        @dragstart="handleMessageDragStart"
                        @dragover="handleMessageDragOver($event, index)"
                        @drop="handleMessageDrop"
                        @dragend="handleDragEnd"
                        @click.shift.capture.stop="
                            handleShiftClick($event, msg.messageId, index)
                        "
                        @action-insert="handleActionInsert(msg, index)"
                        @action-merge="handleActionMerge(msg, index)"
                        @action-split="handleActionSplit(msg.messageId)"
                        @action-delete="handleActionDelete(msg.messageId)"
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
import { FileText } from '@lucide/vue';
import { computed, ref, onMounted } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useFilter } from '@/composables/useFilter';
import { useMessageDragDrop } from '@/composables/useDragDrop';
import MessageItem from '@/components/common/MessageItem.vue';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import { useChunkEditorStore } from '@/stores/editorStore/chunkStore';
import { useUiStore } from '@/stores/uiStore';
import { generateId } from '@/utils/id';
import type { Message } from '@/types/log';

const props = defineProps<{ chunkId: string }>();
const logStore = useLogStore();
const filterTool = useFilter(props.chunkId);
const dragDropTool = useMessageDragDrop();
const dropIndicatorIndex = ref<number | null>(null);
const uiStore = useUiStore();
const messageEditorStore = useMessageEditorStore();
const chunkEditorStore = useChunkEditorStore();

// 组件挂载时注册窗口
onMounted(() => {
    uiStore.registerWindow({
        windowId: props.chunkId,
        windowName: 'chunkView',
    });
});

const currentChunk = computed(function () {
    return logStore.findChunkById(props.chunkId) || undefined;
});

const messages = computed(function () {
    return currentChunk.value ? currentChunk.value.messages : [];
});

function handleShiftClick(_event: MouseEvent, msgId: string, index: number) {
    // 防止因为按住 Shift 点击导致浏览器默认选中文本
    window.getSelection()?.removeAllRanges();
    const lastId = filterTool.lastSelectedMessageId.value;

    // 如果之前没有选中过任何消息，则降级为普通的单选
    if (!lastId) {
        filterTool.toggleMessageSelection(msgId);
        return;
    }

    const lastIndex = messages.value.findIndex(function (m) {
        return m.messageId === lastId;
    });

    if (lastIndex !== -1) {
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);

        // 批量加入选中 Set 中
        for (let i = start; i <= end; i++) {
            filterTool.selectedMessageIds.value.add(
                messages.value[i].messageId,
            );
        }
        filterTool.lastSelectedMessageId.value = msgId;
    } else {
        // 如果上一次点击的消息已经被移动、删除或在其他分块中，重新开始计算起点
        filterTool.toggleMessageSelection(msgId);
    }
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
    const newMessage: Message = {
        messageId: generateId(),
        chunkId: props.chunkId,
        messageIndex: index + 1,
        playerName: msg.playerName,
        account: msg.account,
        time: new Date(),
        content: '',
        isOoc: false,
        isCommand: false,
        role: msg.role,
        note: '',
    };
    messageEditorStore.addMessage(props.chunkId, newMessage, index + 1);
}

function handleActionMerge(msg: Message, index: number) {
    const selectedIds = filterTool.selectedMessageIds.value;
    if (selectedIds.has(msg.messageId) && selectedIds.size > 1) {
        // 多选状态：将选中的所有消息合并到当前被点击项
        messageEditorStore.mergeMessages(
            props.chunkId,
            Array.from(selectedIds),
            msg.messageId,
        );
        selectedIds.clear(); // 合并后清空多选状态
    } else {
        // 单选状态/未处于多选中：与 index+1 往下合并
        if (index < messages.value.length - 1) {
            // 已经是最后一条则不合并
            const nextMsgId = messages.value[index + 1].messageId;
            messageEditorStore.mergeMessages(
                props.chunkId,
                [msg.messageId, nextMsgId],
                msg.messageId,
            );
        }
    }
}

function handleActionSplit(msgId: string) {
    // 从此处切分为新分块
    chunkEditorStore.splitChunk(props.chunkId, msgId);
}

function handleActionDelete(msgId: string) {
    const selectedIds = filterTool.selectedMessageIds.value;
    if (selectedIds.has(msgId)) {
        messageEditorStore.batchDeleteMessages(selectedIds);
        selectedIds.clear();
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
