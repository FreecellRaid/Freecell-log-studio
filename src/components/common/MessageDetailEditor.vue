<template>
    <div class="message-detail-editor">
        <div v-if="showMeta" class="prop-item-time">
            <label>时间:</label>
            <div>{{ formatDate(message.time) }}</div>
        </div>

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
            <select
                :value="values.role"
                @change="emitFieldChange('role', getRoleValue($event))"
            >
                <option value="pl">玩家</option>
                <option value="gm">主持人</option>
                <option value="npc">NPC</option>
                <option value="ob">观众</option>
                <option value="bot">骰子</option>
                <option value="unknown">未知</option>
            </select>
        </div>

        <div class="prop-row">
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    :checked="values.isOoc"
                    @change="
                        emitFieldChange('isOoc', getEventChecked($event))
                    "
                />
                场外消息
            </label>
            <label class="checkbox-label">
                <input
                    type="checkbox"
                    :checked="values.isCommand"
                    @change="
                        emitFieldChange('isCommand', getEventChecked($event))
                    "
                />
                指令消息
            </label>
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
    </div>
</template>

<script setup lang="ts">
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
    }>(),
    {
        showMeta: true,
        contentRows: 5,
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

function getEventChecked(event: Event) {
    return (event.target as HTMLInputElement).checked;
}

function getRoleValue(event: Event): RoleType {
    return (event.target as HTMLSelectElement).value as RoleType;
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
    grid-column: span 2;
    display: flex;
    gap: 4px;
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
