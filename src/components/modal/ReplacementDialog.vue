<template>
    <ModalDialog
        class="replacement-dialog"
        title="替换文本"
        title-id="replace-title"
        @close="close"
    >
        <template #icon><Replace class="ui-icon" /></template>
        <div class="replacement-form">
            <fieldset :disabled="store.stale || !store.messages.length">
                <div class="options-row">
                    <label>
                        替换位置 (已选中{{ store.messages.length }} 条)
                        <select
                            v-model="store.options.field"
                            @change="updateFind"
                        >
                            <option value="content">消息内容</option>
                            <option value="note">备注</option>
                        </select>
                    </label>
                    <label>
                        替换方式
                        <select v-model="store.options.mode">
                            <option value="text">替换匹配文本</option>
                            <option value="whole">覆盖全部内容</option>
                        </select>
                    </label>
                </div>
                <label v-if="store.options.mode === 'text'">
                    查找文本
                    <textarea
                        v-model="store.options.find"
                        data-autofocus
                        rows="2"
                        placeholder="请输入要替换的文本，区分大小写"
                    />
                </label>
                <label>
                    {{
                        store.options.mode === 'whole' ? '统一设置为' : '替换为'
                    }}
                    <textarea
                        v-model="store.options.replacement"
                        :data-autofocus="
                            store.options.mode === 'whole' ? '' : undefined
                        "
                        rows="3"
                        placeholder="请输入替换后的文本，留空表示删除"
                    />
                </label>
            </fieldset>
            <div v-if="store.stale" role="alert">
                工作区已变化，请关闭弹窗后重新选择消息
            </div>
            <div v-else-if="!store.messages.length">
                当前无选中消息，请关闭弹窗后选中消息再进行替换
            </div>
            <div v-if="store.feedback" role="status">{{ store.feedback }}</div>
            <template v-if="store.messages.length && !store.stale">
                <div aria-live="polite">
                    将修改 {{ store.changes.length }} 条消息，共
                    {{ store.occurrences }} 处
                </div>
                <details
                    v-if="store.changes.length"
                    class="preview-section"
                    open
                >
                    <summary class="preview-header">
                        <span class="expand-icon" aria-hidden="true">
                            <ChevronRight class="ui-icon" />
                        </span>
                        <span>修改预览</span>
                        <span class="preview-count">
                            {{ Math.min(store.changes.length, 20) }} /
                            {{ store.changes.length }} 条
                        </span>
                    </summary>
                    <article
                        v-for="change in previewChanges"
                        :key="change.messageId"
                        class="change-preview"
                    >
                        <strong>
                            {{
                                log.messagesById.get(change.messageId)
                                    ?.playerName || '未知角色'
                            }}
                        </strong>
                        <template v-for="side in previewSides" :key="side.key">
                            <div class="preview-label">{{ side.label }}</div>
                            <div class="preview-text">
                                <template
                                    v-for="(segment, index) in change.preview[
                                        side.key
                                    ]"
                                    :key="index"
                                >
                                    <mark
                                        v-if="segment.changed"
                                        class="replacement-highlight"
                                        :class="{ 'is-deleted': !segment.text }"
                                        :aria-label="
                                            !segment.text
                                                ? '已删除匹配文本'
                                                : undefined
                                        "
                                        :title="
                                            !segment.text
                                                ? '已删除匹配文本'
                                                : undefined
                                        "
                                    >
                                        {{ segment.text }}
                                    </mark>
                                    <template v-else>
                                        {{ segment.text }}
                                    </template>
                                </template>
                                <template
                                    v-if="
                                        !change[side.key] &&
                                        (side.key === 'before' ||
                                            store.options.mode === 'whole')
                                    "
                                >
                                    （空）
                                </template>
                            </div>
                        </template>
                    </article>
                </details>
            </template>
        </div>
        <template #footer>
            <div class="replacement-buttons">
                <button
                    type="button"
                    class="text-button"
                    @click="store.clearInputs()"
                >
                    清空
                </button>
                <button
                    type="button"
                    class="text-button is-primary"
                    :disabled="store.stale || !store.changes.length"
                    @click="store.apply()"
                >
                    替换
                </button>
            </div>
        </template>
    </ModalDialog>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/stores/ui/dialogStore';

import { computed, onUnmounted } from 'vue';
import { buildReplacementPreview } from '@/editor/replacement';
import ModalDialog from './ModalDialog.vue';
import { useReplacementStore } from '@/stores/editor/replacementStore';
import { useLogStore } from '@/stores/project/logStore';
import { useSearchStore } from '@/stores/editor/searchStore';
import { ChevronRight, Replace } from '@lucide/vue';

const store = useReplacementStore();
const log = useLogStore();
const editorDialogs = useDialogStore();
const search = useSearchStore();
const previewSides = [
    { key: 'before', label: '修改前' },
    { key: 'after', label: '修改后' },
] as const;
const previewChanges = computed(() =>
    store.changes.slice(0, 20).map((change) => ({
        ...change,
        preview: buildReplacementPreview(change.before, store.options),
    })),
);

onUnmounted(store.reset);
function close() {
    editorDialogs.close('replace');
}
function updateFind() {
    store.options.find =
        store.source !== 'search'
            ? ''
            : store.options.field === 'content'
              ? search.contentRegex
                  ? ''
                  : search.quickSearch.trim()
              : search.noteRegex
                ? ''
                : search.filter.note.trim();
}
</script>

<style scoped>
.replacement-dialog {
    width: min(600px, calc(100vw - 32px));
    max-height: 90dvh;
}
.replacement-form,
fieldset,
label {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
}
label {
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.options-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}
select,
textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 8px;
    font: inherit;
    color: var(--text-primary);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 4px;
}
textarea {
    resize: vertical;
}
.preview-label {
    color: var(--text-muted);
    font-size: 12px;
}
.preview-header {
    display: flex;
    align-items: center;
    padding: 8px 0px;
    background: var(--bg-secondary);
    cursor: pointer;
    user-select: none;
    list-style: none;
}
.preview-header::-webkit-details-marker {
    display: none;
}
.preview-header .ui-icon {
    width: 14px;
    height: 14px;
}
.preview-section[open] .expand-icon {
    transform: rotate(90deg);
}
.preview-count {
    margin-left: auto;
    padding-left: 12px;
    color: var(--text-muted);
    font-size: 12px;
}
.change-preview {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
}
.change-preview:last-child {
    border-bottom: 0;
}
.preview-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
    margin: 4px 0 8px;
}
.replacement-highlight {
    color: inherit;
    background: color-mix(in srgb, var(--active-accent) 25%, transparent);
    border-radius: 2px;
    box-decoration-break: clone;
    white-space: break-spaces;
}
.replacement-highlight.is-deleted::after {
    content: '';
    padding: 0 2px;
}
.replacement-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;
}
.replacement-buttons button {
    padding: 6px 12px;
    font: inherit;
}
button:disabled,
fieldset:disabled {
    opacity: 0.5;
}
button:disabled {
    cursor: default;
}
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
button:focus-visible {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}
</style>
