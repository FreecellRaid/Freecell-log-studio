<template>
    <div
        ref="editWrapper"
        class="message-item"
        :data-message-id="message.messageId"
        :class="{
            'is-selected': isSelected,
            'is-active': isActive,
            'is-hidden-active': isHidden,
        }"
        :draggable="!isEditing"
        @click="handleClick"
        @dragstart="handleDragStart"
        @dragenter.prevent
        @dragover.prevent="handleDragOver"
        @drop.prevent.stop="handleDrop"
        @dragend="handleDragEnd"
    >
        <div class="message-actions">
            <button
                class="action-button"
                title="在下方插入新消息"
                @click.stop="$emit('actionInsert')"
            >
                <Plus class="ui-icon" />
            </button>
            <button
                class="action-button"
                title="向下合并/合并选中项"
                @click.stop="$emit('actionMerge')"
            >
                <ChevronsDown class="ui-icon" />
            </button>
            <button
                class="action-button"
                title="从此拆分为新块"
                @click.stop="$emit('actionSplit')"
            >
                <Scissors class="ui-icon" />
            </button>
            <button
                class="action-button action-button-warning"
                title="删除消息"
                @click.stop="$emit('actionDelete')"
            >
                <Trash2 class="ui-icon" />
            </button>
        </div>

        <div class="message-header">
            <span class="message-name" :style="computedStyles.nameStyle">
                {{ message.playerName }}
                <span
                    v-if="styleStore.viewSettings.showAccount"
                    class="message-account"
                >
                    ({{ message.account }})
                </span>
            </span>

            <span class="message-time" v-if="styleStore.viewSettings.showTime">
                {{ formatDate(message.time) }}
            </span>
        </div>

        <div
            class="message-content"
            :style="computedStyles.contentStyle"
            @dblclick.stop="$emit('startEdit', message)"
        >
            <div class="textarea-wrapper" v-if="isEditing">
                <div class="height-mirror">{{ editContentLocal }}&nbsp;</div>
                <textarea
                    ref="editInput"
                    v-model="editContentLocal"
                    class="content-editor absolute-editor"
                    @keydown.enter="handleEditEnter"
                    @keydown.esc="$emit('cancelEdit')"
                ></textarea>
            </div>
            <div v-else>
                {{ message.content }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue';
import type { Message } from '@/types/log';
import { onClickOutside } from '@vueuse/core';
import { useStyleStore } from '@/stores/styleStore';
import { formatDate } from '@/utils/date';
import { computeStyleForMessage } from '@/editor/styleEngine';
import { Trash2, Plus, Scissors, ChevronsDown } from '@lucide/vue';

// 加入虚拟滚动之后，把编辑状态放在messageItem里会导致状态丢失
// 统一改成父组件传入
const props = defineProps<{
    message: Message;
    chunkId: string;
    index: number;
    isSelected: boolean;
    isActive: boolean;
    isEditing: boolean;
    editingContent: string;
}>();

const emit = defineEmits<{
    (e: 'select', event: MouseEvent, messageId: string, index: number): void;
    (
        e: 'dragstart',
        event: DragEvent,
        messageId: string,
        chunkId: string,
        index: number,
    ): void;
    (e: 'dragover', event: DragEvent): void;
    (e: 'drop', event: DragEvent, chunkId: string, index: number): void;
    (e: 'dragend'): void;
    (e: 'actionInsert'): void;
    (e: 'actionMerge'): void;
    (e: 'actionSplit'): void;
    (e: 'actionDelete'): void;
    (e: 'startEdit', message: Message): void;
    (e: 'updateContent', content: string): void;
    (e: 'saveEdit', messageId: string): void;
    (e: 'cancelEdit'): void;
}>();

const styleStore = useStyleStore();

const computedStyles = computed(function () {
    return computeStyleForMessage(props.message, styleStore.activeRules);
});

function handleClick(event: MouseEvent) {
    emit('select', event, props.message.messageId, props.index);
}

function handleDragStart(event: DragEvent) {
    if (props.isEditing) {
        event.preventDefault();
        return;
    }

    emit(
        'dragstart',
        event,
        props.message.messageId,
        props.chunkId,
        props.index,
    );
}

function handleDragOver(event: DragEvent) {
    emit('dragover', event);
}

function handleDrop(event: DragEvent) {
    emit('drop', event, props.chunkId, props.index);
}

function handleDragEnd() {
    emit('dragend');
}

// 计算消息是否应该被隐藏(纯粹样式判断)
const isHidden = computed(() => {
    const { hideOoc, hideCommand } = styleStore.viewSettings;
    return (
        (hideOoc && props.message.isOoc) ||
        (hideCommand && props.message.isCommand)
    );
});

const editContentLocal = computed({
    get: () => props.editingContent,
    set: (val) => emit('updateContent', val),
});
const editInput = ref<HTMLTextAreaElement | null>(null);
function handleEditEnter(event: KeyboardEvent) {
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    event.preventDefault();
    emit('saveEdit', props.message.messageId);
}

const editWrapper = ref<HTMLElement | null>(null);

watch(
    () => props.isEditing,
    async (newVal) => {
        await nextTick();
        if (newVal) {
            if (editInput.value) {
                editInput.value.focus({ preventScroll: true });
                editInput.value.setSelectionRange(
                    props.editingContent.length,
                    props.editingContent.length,
                );
            }
        }
    },
);

onClickOutside(editWrapper, () => {
    if (!props.isEditing) {
        return;
    }
    emit('saveEdit', props.message.messageId);
});
</script>

<style scoped>
.message-item {
    padding: 10px 20px;
    background-color: var(--bg-workspace);
    cursor: pointer;
    position: relative;
}

.is-hidden-active {
    opacity: 0.5;
    filter: grayscale(0.5);
}

.message-item:hover {
    box-shadow: inset 0 0 0 1px var(--active-accent);
}

:global(.scrollbar-visible) .message-item:hover {
    box-shadow: none;
}

:global(.scrollbar-visible) .message-item:hover .message-actions {
    opacity: 0;
    pointer-events: none;
}

.message-item.is-selected.is-active {
    background-color: var(--selection-bg);
}

.message-item.is-selected:not(.is-active) {
    background-color: var(--inactive-selection-bg);
}

.message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 0.9em;
    color: var(--text-muted);
}

.message-name {
    font-weight: bold;
}

.message-account {
    font-weight: normal;
    font-size: 0.85em;
    color: var(--text-secondary);
}

.message-content {
    min-height: 1em;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;
}

.message-actions {
    position: absolute;
    top: 8px;
    right: 12px;
    display: flex;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.1s;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    border-radius: 4px;
    border: none;
    z-index: 10;
}

.message-item:hover .message-actions {
    opacity: 1;
    pointer-events: auto;
}

.action-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    border-radius: 4px;
    color: var(--icon-color);
    opacity: 0.75;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

/* 悬停效果 */
.action-button:hover {
    opacity: 1;
}

.action-button-warning:hover {
    color: var(--color-warning);
}

.action-button :deep(.ui-icon),
.action-button .ui-icon {
    width: 14px;
    height: 14px;
}

.content-editor {
    min-height: 1em;
    line-height: 1.5;
    padding: 4px 0;
    font-family: inherit;
    word-break: break-word;
    white-space: pre-wrap;
    box-sizing: border-box;
}
.content-editor {
    width: 100%;
    min-height: 3em;
    padding: 4px 8px;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    border: 1px solid var(--active-accent);
    border-radius: 4px;
    background: var(--bg-input);
    color: var(--text-main);
    resize: vertical;
    outline: none;
}

.textarea-wrapper {
    position: relative;
    width: 100%;
    min-height: 1em;
}

.height-mirror {
    visibility: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 4px 8px;
    border: 1px solid transparent;
    min-height: 3em;
}

.absolute-editor {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%; /* 继承 mirror 撑开的高度 */
    resize: none;
    overflow: hidden;
}
</style>
