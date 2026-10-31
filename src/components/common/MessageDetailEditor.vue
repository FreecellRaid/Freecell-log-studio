<template>
    <div v-if="showMeta" class="prop-item-time">
        <div>时间：{{ formatDate(message.time) }}</div>
    </div>

    <div class="message-detail-editor">
        <div class="prop-item">
            <label>玩家名</label>
            <input
                type="text"
                :value="values.playerName"
                @input="emitTextInput('playerName', $event)"
                @blur="emitCommit('playerName')"
                @keydown.enter.exact.prevent="emitCommit('playerName')"
            />
        </div>

        <div class="prop-item">
            <label>账号</label>
            <input
                type="text"
                :value="values.account"
                @input="emitTextInput('account', $event)"
                @blur="emitCommit('account')"
                @keydown.enter.exact.prevent="emitCommit('account')"
            />
        </div>

        <div class="prop-item">
            <label>身份</label>
            <PopoverSelect
                :model-value="values.role"
                @update:model-value="emitFieldChange('role', $event)"
                aria-label="身份"
                :options="
                    [
                        { value: 'pl', label: '玩家' },
                        { value: 'gm', label: '主持人' },
                        { value: 'npc', label: 'NPC' },
                        { value: 'ob', label: '观众' },
                        { value: 'bot', label: '骰子' },
                        { value: 'unknown', label: '未知' },
                    ] as const
                "
            />
        </div>

        <div class="prop-row">
            <ToggleButton
                :model-value="values.isOoc"
                @update:model-value="emitFieldChange('isOoc', Boolean($event))"
            >
                场外消息
            </ToggleButton>
            <ToggleButton
                :model-value="values.isCommand"
                @update:model-value="
                    emitFieldChange('isCommand', Boolean($event))
                "
            >
                指令消息
            </ToggleButton>
        </div>

        <div class="prop-item full-width">
            <label>消息内容</label>
            <textarea
                :value="values.content"
                :rows="contentRows"
                @input="emitTextInput('content', $event)"
                @blur="emitCommit('content')"
                @keydown.enter.exact.prevent="emitCommit('content')"
            ></textarea>
        </div>

        <div class="prop-item full-width">
            <label>备注</label>
            <input
                type="text"
                :value="values.note"
                placeholder="备注信息..."
                @input="emitTextInput('note', $event)"
                @blur="emitCommit('note')"
                @keydown.enter.exact.prevent="emitCommit('note')"
            />
        </div>
        <div class="prop-item full-width">
            <label>包含 {{ message.images?.length ?? 0 }} 张图片</label>
            <MessageImages :message="message" />
        </div>
    </div>
</template>

<script setup lang="ts">
import PopoverSelect from '@/components/common/PopoverSelect.vue';
import ToggleButton from '@/components/common/ToggleButton.vue';
import MessageImages from '@/components/common/MessageImages.vue';

import type { Message, RoleType } from '@/types/log';
import { formatDate } from '@/utils/date';

export type MessageDetailTextField =
    | 'playerName'
    | 'account'
    | 'content'
    | 'note';

export interface MessageDetailValues {
    playerName: string;
    account: string;
    role: RoleType;
    content: string;
    note: string;
    isOoc: boolean;
    isCommand: boolean;
}

const props = withDefaults(
    defineProps<{
        message: Message;
        values: MessageDetailValues;
        showMeta?: boolean;
        contentRows?: number;
        imageSummaryOnly?: boolean;
    }>(),
    {
        showMeta: true,
        contentRows: 5,
        imageSummaryOnly: false,
    },
);

const emit = defineEmits<{
    (e: 'textInput', field: MessageDetailTextField, value: string): void;
    (e: 'commitText', field: MessageDetailTextField): void;
    <K extends keyof MessageDetailValues>(
        e: 'fieldChange',
        field: K,
        value: MessageDetailValues[K],
    ): void;
}>();

function emitTextInput(field: MessageDetailTextField, event: Event) {
    emit('textInput', field, getEventValue(event));
}

function emitCommit(field: MessageDetailTextField) {
    emit('commitText', field);
}

function emitFieldChange<K extends keyof MessageDetailValues>(
    field: K,
    value: MessageDetailValues[K],
) {
    emit('fieldChange', field, value);
}

function getEventValue(event: Event) {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

void props;
</script>

<style scoped>
.message-detail-editor {
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.prop-item-time {
    background-color: var(--hover-bg);
    display: flex;
    padding: 8px 12px;
    font-size: 12px;
}

.prop-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.prop-item.full-width {
    grid-column: span 2;
}

.prop-item label {
    font-size: 11px;
    color: var(--text-muted);
}

.prop-item input[type='text'],
.prop-item textarea {
    width: 100%;
    background-color: var(--bg-workspace);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

.prop-item :deep(.select-trigger) {
    background-color: var(--bg-workspace);
    padding: 6px 8px;
    font-size: 13px;
}

.prop-item input:focus,
.prop-item textarea:focus {
    border-color: var(--active-accent);
}

.prop-row {
    grid-column: span 2;
    display: flex;
    gap: 20px;
    padding-top: 5px;
}

.prop-row :deep(.toggle-button) {
    font-size: 12px;
}
</style>
