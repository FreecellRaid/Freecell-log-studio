<template>
    <div
        class="sidebar-right-container"
        :style="{ width: uiStore.rightPanelWidth + 'px' }"
    >
        <div
            class="resize-handle resize-handle-x resize-handle-overlay resize-handle-left-edge"
            @mousedown="startResize"
        ></div>
        <div class="panel">
            <header class="panel-header">
                <div class="header-title">
                    <h3>消息属性检查器</h3>
                </div>
                <div class="count" v-if="selectedItems.length > 0">
                    已选中 {{ selectedItems.length }} 条
                </div>
            </header>

            <div class="inspector-content">
                <div v-if="selectedMessageCount === 0" class="panel-empty-hint">
                    <div>
                        未选中消息
                        <br />
                        在编辑器中点击消息以查看详情
                    </div>
                </div>

                <div
                    v-for="{ message, chunkId } in selectedItems"
                    :key="message.messageId"
                    class="message-detail-card"
                >
                    <div class="card-header">
                        <span class="id-badge">
                            ID: {{ message.messageId }}
                        </span>
                    </div>

                    <div class="property-grid">
                        <div class="prop-item-time">
                            <label>时间:</label>
                            <div>{{ formatDate(message.time) }}</div>
                        </div>

                        <MessageDetailEditor
                            :message="message"
                            :values="getMessageValues(message)"
                            @text-input="
                                (field, value) =>
                                    updateDraft(message, field, value)
                            "
                            @commit-text="
                                (field) =>
                                    commitDraft(
                                        chunkId,
                                        message.messageId,
                                        field,
                                    )
                            "
                            @field-change="
                                (field, value) =>
                                    updateField(
                                        chunkId,
                                        message.messageId,
                                        field,
                                        value,
                                    )
                            "
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MessageDetailEditor from '@/components/common/MessageDetailEditor.vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import { useActiveContext } from '@/composables/useActiveContext';
import { useDraftValues } from '@/composables/useDraftValues';
import { usePanelResize } from '@/composables/usePanelResize';
import { useLogStore } from '@/stores/logStore';
import { useLogEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import type { Message } from '@/types/log';

const activeContext = useActiveContext();
const logStore = useLogStore();
const logEditorStore = useLogEditorStore();
const uiStore = useUiStore();
const { startResize } = usePanelResize({
    edge: 'left',
    getWidth: () => uiStore.rightPanelWidth,
    setWidth: (width) => {
        uiStore.rightPanelWidth = width;
    },
});

// updateMessage 需要 chunkId 才能准确定位
const selectedItems = computed(() => {
    return logStore.allMessages
        .filter((msg) =>
            activeContext.selectedMessageIds.value.has(msg.messageId),
        )
        .map((msg) => ({
            message: { ...msg },
            chunkId: msg.chunkId,
        }));
});

const selectedMessageCount = computed(
    () => activeContext.selectedMessageIds.value.size,
);

const messageDrafts = useDraftValues<MessageDetailTextField>();

function getDraftValue(message: Message, field: MessageDetailTextField) {
    return messageDrafts.getValue(
        message.messageId,
        field,
        message[field] ?? '',
    );
}

function getMessageValues(message: Message): MessageDetailValues {
    return {
        playerName: getDraftValue(message, 'playerName'),
        account: getDraftValue(message, 'account'),
        role: message.role,
        content: getDraftValue(message, 'content'),
        note: getDraftValue(message, 'note'),
        isOoc: message.isOoc,
        isCommand: message.isCommand,
    };
}

function updateDraft(
    message: Message,
    field: MessageDetailTextField,
    value: string,
) {
    messageDrafts.update(message.messageId, field, value);
}

function commitDraft(
    chunkId: string,
    messageId: string,
    field: MessageDetailTextField,
) {
    messageDrafts.commit(messageId, field, (value) => {
        logEditorStore.updateMessage(chunkId, messageId, {
            [field]: value,
        });
    });
}

function updateBooleanField(
    chunkId: string,
    messageId: string,
    field: 'isOoc' | 'isCommand',
    value: boolean,
) {
    logEditorStore.updateMessage(chunkId, messageId, {
        [field]: value,
    });
}

function updateField(
    chunkId: string,
    messageId: string,
    field: string,
    value: unknown,
) {
    logEditorStore.updateMessage(chunkId, messageId, {
        [field]: value,
    });
}
</script>

<style scoped>
.sidebar-right-container {
    height: 100%;
    min-height: 0;
}

.inspector-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
}

/* 消息详情卡片 */
.message-detail-card {
    border: 1px solid var(--border-color);
    margin: 0px 10px 10px 10px;
    background-color: var(--bg-workspace);
    box-sizing: border-box;
}

.card-header {
    padding: 6px 10px;
    background-color: var(--hover-bg);
    border-bottom: 1px solid var(--border-color);
    font-family: monospace;
    font-size: 11px;
}
</style>
