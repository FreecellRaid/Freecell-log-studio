<template>
    <div class="panel" @pointerdown="windowStore.setFocus('exportFormat')">
        <div class="panel-header">
            <div class="header-title">
                <h3>导出模板</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="handleCreateFormat"
                title="新建模板"
            >
                <Plus class="ui-icon" />
            </button>
        </div>

        <div class="panel-block-list">
            <div v-if="exportStore.formats.length === 0" class="empty-hint">
                暂无导出模板，点击 + 新建
            </div>

            <div
                v-for="fmt in exportStore.formats"
                :key="fmt.formatId"
                class="config-block"
                :class="{
                    'is-active': exportStore.activeFormatId === fmt.formatId,
                }"
            >
                <div
                    class="config-header"
                    @click="handleSelectFormat(fmt.formatId)"
                >
                    <div
                        class="expand-icon"
                        :class="{ 'is-expanded': expandedId === fmt.formatId }"
                    >
                        <ChevronRight class="ui-icon" />
                    </div>

                    <div class="config-name">
                        <span>{{ fmt.formatName || '未命名模板' }}</span>
                    </div>

                    <button
                        v-if="!isPreset(fmt.formatId)"
                        class="icon-button icon-button-warning"
                        @click.stop="handleDelete(fmt.formatId)"
                        title="删除"
                    >
                        <Trash2 class="ui-icon" />
                    </button>

                    <button
                        class="icon-button"
                        :class="{
                            'is-active-btn':
                                exportStore.activeFormatId === fmt.formatId,
                        }"
                        @click.stop="exportStore.setActive(fmt.formatId)"
                        title="设为默认"
                    >
                        <Check class="ui-icon" />
                    </button>
                </div>

                <div v-show="expandedId === fmt.formatId" class="config-body">
                    <div class="form-group">
                        <label>模板名称</label>
                        <div class="input-group">
                            <input
                                class="form-control"
                                type="text"
                                :value="getFormatDraftValue(fmt, 'formatName')"
                                @input="
                                    updateFormatDraft(fmt, 'formatName', $event)
                                "
                                v-click-outside="
                                    () => commitFormatDraft(fmt, 'formatName')
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'formatName')
                                "
                                placeholder="输入模板名称"
                            />
                            <button
                                class="icon-button"
                                :class="{
                                    'is-active': previewedFormatIds.has(
                                        fmt.formatId,
                                    ),
                                }"
                                @click.stop="handleTogglePreview(fmt.formatId)"
                                title="预览模板效果"
                            >
                                <Eye class="ui-icon" />
                            </button>
                        </div>
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>文件后缀</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'fileExtension')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'fileExtension',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () =>
                                        commitFormatDraft(fmt, 'fileExtension')
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'fileExtension')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>消息分隔符</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'messageSeparator')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'messageSeparator',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () =>
                                        commitFormatDraft(
                                            fmt,
                                            'messageSeparator',
                                        )
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'messageSeparator')
                                "
                            />
                        </div>
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>幕间分隔</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'docSeparator')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'docSeparator',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () => commitFormatDraft(fmt, 'docSeparator')
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'docSeparator')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>场景分隔</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'chunkSeparator')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'chunkSeparator',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () =>
                                        commitFormatDraft(fmt, 'chunkSeparator')
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'chunkSeparator')
                                "
                            />
                        </div>
                    </div>
                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>玩家名格式</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'playerNameFormat')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'playerNameFormat',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () =>
                                        commitFormatDraft(
                                            fmt,
                                            'playerNameFormat',
                                        )
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'playerNameFormat')
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>帐号格式</label>
                            <input
                                class="form-control"
                                type="text"
                                :value="
                                    getFormatDraftValue(fmt, 'accountFormat')
                                "
                                @input="
                                    updateFormatDraft(
                                        fmt,
                                        'accountFormat',
                                        $event,
                                    )
                                "
                                v-click-outside="
                                    () =>
                                        commitFormatDraft(fmt, 'accountFormat')
                                "
                                @keydown.enter.exact.prevent="
                                    commitFormatDraft(fmt, 'accountFormat')
                                "
                            />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>消息布局模板</label>
                        <textarea
                            class="form-control"
                            :value="getFormatDraftValue(fmt, 'messageTemplate')"
                            rows="3"
                            @input="
                                updateFormatDraft(
                                    fmt,
                                    'messageTemplate',
                                    $event,
                                )
                            "
                            v-click-outside="
                                () => commitFormatDraft(fmt, 'messageTemplate')
                            "
                            @keydown.enter.exact.prevent="
                                commitFormatDraft(fmt, 'messageTemplate')
                            "
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, ChevronRight, Trash2, Check, Eye } from '@lucide/vue';
import { EXPORT_PRESET_IDS, useExportStore } from '@/stores/exportStore';
import { useWindowStore } from '@/stores/windowStore';
import type { ExportFormat } from '@/types/export';
import { vClickOutside } from '@/directives/clickOutside';
import { useDraftValues } from '@/composables/useDraftValues';

const exportStore = useExportStore();
const windowStore = useWindowStore();
const expandedId = ref<string | null>(exportStore.activeFormatId);
type FormatDraftField = Extract<
    keyof ExportFormat,
    | 'formatName'
    | 'fileExtension'
    | 'messageSeparator'
    | 'docSeparator'
    | 'chunkSeparator'
    | 'playerNameFormat'
    | 'accountFormat'
    | 'messageTemplate'
>;
const formatDrafts = useDraftValues<FormatDraftField>();
const previewedFormatIds = computed(() => {
    const ids = new Set<string>();

    for (const win of windowStore.openWindows.values()) {
        if (win.windowName === 'exportPreview') {
            ids.add(win.originalId);
        }
    }

    return ids;
});

function handleTogglePreview(formatId: string) {
    exportStore.setActive(formatId);
    windowStore.openExportPreview(formatId);
}

function handleSelectFormat(id: string) {
    exportStore.setActive(id);
    toggleExpand(id);
}

function toggleExpand(id: string) {
    expandedId.value = expandedId.value === id ? null : id;
}

function isPreset(id: string) {
    return EXPORT_PRESET_IDS.includes(id as (typeof EXPORT_PRESET_IDS)[number]);
}

function getFormatDraftValue(fmt: ExportFormat, field: FormatDraftField) {
    return formatDrafts.getValue(fmt.formatId, field, fmt[field]);
}

function updateFormatDraft(
    fmt: ExportFormat,
    field: FormatDraftField,
    event: Event,
) {
    formatDrafts.update(fmt.formatId, field, event);
}

function commitFormatDraft(fmt: ExportFormat, field: FormatDraftField) {
    formatDrafts.commit(fmt.formatId, field, (value) => {
        fmt[field] = value;
        exportStore.saveToLocal();
    });
}

function handleCreateFormat() {
    const newFmt = exportStore.createFormat();
    expandedId.value = newFmt.formatId;
}

function handleDelete(id: string) {
    if (window.confirm('确定要删除导出模板吗？本操作不可撤销')) {
        exportStore.deleteFormat(id);
    }
}
</script>

<style scoped>
.config-block {
    overflow: hidden;
}

.config-header {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background-color: var(--bg-secondary);
    cursor: pointer;
    user-select: none;
}

.config-header:hover {
    background: var(--hover-bg);
}

.config-block.is-active .config-header {
    background-color: var(--selection-bg);
    color: var(--active-accent);
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}

.config-name {
    font-size: 14px;
    margin-right: auto;
    flex: 1;
    min-width: 0;
}

.config-name span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 0;
    margin-left: 8px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    color: var(--icon-color);
}

.ui-icon {
    width: 16px;
    height: 16px;
}

.config-header:hover .icon-button,
.config-header:focus-within .icon-button {
    opacity: 1;
    pointer-events: auto;
}

.is-active-btn {
    color: var(--active-accent);
    opacity: 1;
    /* 激活态图标始终显示 */
}

.input-group .icon-button {
    opacity: 1;
    pointer-events: auto;
    margin-left: 0;
}

.icon-button-warning:hover {
    color: var(--color-warning);
}

.config-body {
    display: flex;
    flex-direction: column;
    padding: 12px;
    background-color: var(--bg-primary);
}

.form-group {
    margin-bottom: 12px;
}

.form-row {
    display: flex;
    gap: 12px;
}

.form-row.two-col > .form-group {
    flex: 1;
    min-width: 0;
}

.form-group input,
.form-group textarea {
    font-family: 'Fira Code', monospace;
    outline: none;
}

.form-group textarea {
    resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
    border-color: var(--active-accent);
}

.input-group {
    display: flex;
    gap: 8px;
    align-items: center;
}

.input-group input {
    flex: 1;
}
</style>
