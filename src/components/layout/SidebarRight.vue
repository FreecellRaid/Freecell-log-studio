<template>
    <div :style="{ width: uiStore.rightPanelWidth + 'px' }">
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

                <div v-for="chunk in allChunks" :key="chunk.chunkId">
                    <div
                        v-for="message in chunk.messages"
                        :key="message.messageId"
                        v-show="
                            activeContext.selectedMessageIds.value.has(
                                message.messageId,
                            )
                        "
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

                            <div class="prop-item">
                                <label>玩家名</label>
                                <input
                                    type="text"
                                    :value="
                                        getDraftValue(message, 'playerName')
                                    "
                                    @input="
                                        updateDraft(
                                            message,
                                            'playerName',
                                            $event,
                                        )
                                    "
                                    v-click-outside="
                                        () =>
                                            commitDraft(
                                                chunk.chunkId,
                                                message.messageId,
                                                'playerName',
                                            )
                                    "
                                    @keydown.enter.exact.prevent="
                                        commitDraft(
                                            chunk.chunkId,
                                            message.messageId,
                                            'playerName',
                                        )
                                    "
                                />
                            </div>

                            <div class="prop-item">
                                <label>账号</label>
                                <input
                                    type="text"
                                    :value="getDraftValue(message, 'account')"
                                    @input="
                                        updateDraft(message, 'account', $event)
                                    "
                                    v-click-outside="
                                        () =>
                                            commitDraft(
                                                chunk.chunkId,
                                                message.messageId,
                                                'account',
                                            )
                                    "
                                    @keydown.enter.exact.prevent="
                                        commitDraft(
                                            chunk.chunkId,
                                            message.messageId,
                                            'account',
                                        )
                                    "
                                />
                            </div>

                            <div class="prop-item">
                                <label>身份</label>
                                <select
                                    :value="message.role"
                                    @change="
                                        updateField(
                                            chunk.chunkId,
                                            message.messageId,
                                            'role',
                                            $event,
                                        )
                                    "
                                >
                                    <option value="pl">玩家</option>
                                    <option value="gm">主持人</option>
                                    <option value="npc">NPC</option>
                                    <option value="ob">观众</option>
                                    <option value="bot">骰子</option>
                                </select>
                            </div>
                            <div class="prop-row">
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        :checked="message.isOoc"
                                        @change="
                                            updateField(
                                                chunk.chunkId,
                                                message.messageId,
                                                'isOoc',
                                                $event,
                                                'boolean',
                                            )
                                        "
                                    />
                                    场外消息
                                </label>
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        :checked="message.isCommand"
                                        @change="
                                            updateField(
                                                chunk.chunkId,
                                                message.messageId,
                                                'isCommand',
                                                $event,
                                                'boolean',
                                            )
                                        "
                                    />
                                    指令消息
                                </label>
                            </div>

                            <div class="prop-item full-width">
                                <label>消息内容</label>
                                <textarea
                                    :value="getDraftValue(message, 'content')"
                                    @input="
                                        updateDraft(message, 'content', $event)
                                    "
                                    v-click-outside="
                                        () =>
                                            commitDraft(
                                                chunk.chunkId,
                                                message.messageId,
                                                'content',
                                            )
                                    "
                                    @keydown.enter.exact.prevent="
                                        commitDraft(
                                            chunk.chunkId,
                                            message.messageId,
                                            'content',
                                        )
                                    "
                                    rows="5"
                                ></textarea>
                            </div>

                            <div class="prop-item full-width">
                                <label>备注</label>
                                <input
                                    type="text"
                                    :value="getDraftValue(message, 'note')"
                                    @input="
                                        updateDraft(message, 'note', $event)
                                    "
                                    v-click-outside="
                                        () =>
                                            commitDraft(
                                                chunk.chunkId,
                                                message.messageId,
                                                'note',
                                            )
                                    "
                                    @keydown.enter.exact.prevent="
                                        commitDraft(
                                            chunk.chunkId,
                                            message.messageId,
                                            'note',
                                        )
                                    "
                                    placeholder="备注信息..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useActiveContext } from '@/composables/useActiveContext';
import { useDraftValues } from '@/composables/useDraftValues';
import { usePanelResize } from '@/composables/usePanelResize';
import { useLogStore } from '@/stores/logStore';
import { useLogEditorStore } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import type { Message } from '@/types/log';
import { formatDate } from '@/utils/date';
import { vClickOutside } from '@/directives/clickOutside';

const activeContext = useActiveContext();
const logStore = useLogStore();
const logEditorStore = useLogEditorStore();
const uiStore = useUiStore();
const allChunks = computed(() => logStore.allChunks);
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

type EditableTextField = 'playerName' | 'account' | 'content' | 'note';

const messageDrafts = useDraftValues<EditableTextField>();

function getDraftValue(message: Message, field: EditableTextField) {
    return messageDrafts.getValue(
        message.messageId,
        field,
        message[field] ?? '',
    );
}

function updateDraft(message: Message, field: EditableTextField, event: Event) {
    messageDrafts.update(message.messageId, field, event);
}

function commitDraft(
    chunkId: string,
    messageId: string,
    field: EditableTextField,
) {
    messageDrafts.commit(messageId, field, (value) => {
        logEditorStore.updateMessage(chunkId, messageId, {
            [field]: value,
        });
    });
}

function updateField(
    chunkId: string,
    messageId: string,
    field: string,
    event: Event,
    type: 'string' | 'number' | 'boolean' = 'string',
) {
    const target = event.target as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
    let value: any;

    if (type === 'boolean') {
        value = (target as HTMLInputElement).checked;
    } else if (type === 'number') {
        value = parseInt(target.value, 10) || 0;
    } else {
        value = target.value;
    }

    logEditorStore.updateMessage(chunkId, messageId, {
        [field]: value,
    });
}
</script>

<style scoped>
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

.property-grid {
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.prop-item-time {
    grid-column: span 2;
    display: flex;
    gap: 4px;
    font-size: 12px;
}

.prop-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.prop-item.full-width {
    grid-column: span 2;
}

.prop-item label {
    font-size: 11px;
    color: var(--text-muted);
}

.prop-item input[type='text'],
.prop-item input[type='number'],
.prop-item select,
.prop-item textarea {
    width: 100%;
    box-sizing: border-box;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

.prop-item input:focus,
.prop-item select:focus,
.prop-item textarea:focus {
    border-color: var(--active-accent);
}

/* 复选框行 */
.prop-row {
    grid-column: span 2;
    display: flex;
    gap: 20px;
    padding-top: 5px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    cursor: pointer;
}
</style>
