<template>
    <section
        class="panel resource-panel"
        @pointerdown.capture="windows.setFocus('resources')"
        @focusin="windows.setFocus('resources')"
    >
        <header class="panel-header">
            <div class="header-title"><h3>资源管理</h3></div>
            <span class="resource-total">
                {{ panel.resources.length }} 张图片
            </span>
        </header>
        <div class="resource-toolbar">
            <span>已选 {{ panel.selectedCount }} 项</span>
            <button
                class="action-button"
                :disabled="!panel.selectedCount || panel.preparing"
                title="将选中的远程图片下载为本地副本"
                @click="panel.downloadSelected"
            >
                <Download class="ui-icon" />
                {{ panel.preparing ? '准备中…' : '批量下载' }}
            </button>
            <button
                class="action-button"
                :disabled="!panel.resources.length"
                title="全选"
                @click="panel.selectAll"
            >
                <SquareCheckBig class="ui-icon" />
            </button>
            <button
                class="action-button"
                :disabled="!panel.selectedCount"
                title="删除选中资源的所有引用"
                @click="panel.deleteSelected"
            >
                <Trash2 class="ui-icon" />
            </button>
        </div>
        <p
            v-if="panel.feedback || readError"
            class="resource-feedback"
            role="status"
        >
            {{ readError || panel.feedback }}
        </p>
        <p v-if="!panel.resources.length" class="panel-empty-hint">
            项目中暂无图片资源
        </p>
        <RecycleScroller
            v-else
            class="resource-list"
            :items="panel.resources"
            :item-size="112"
            key-field="resourceId"
            role="listbox"
            aria-label="项目图片资源"
            aria-multiselectable="true"
        >
            <template #default="{ item }">
                <div
                    class="resource-row"
                    :class="{
                        'is-selected': panel.selectedIds.has(item.resourceId),
                        'is-active':
                            windows.currentActiveWindow.windowId ===
                            'resources',
                    }"
                    role="option"
                    :aria-selected="panel.selectedIds.has(item.resourceId)"
                    tabindex="0"
                    @click="panel.select($event, item.resourceId)"
                    @keydown.space.prevent="panel.toggle(item.resourceId)"
                >
                    <button
                        type="button"
                        class="resource-thumbnail"
                        :aria-label="`编辑图片：${item.attachment.name || '图片'}`"
                        @click.stop="panel.editResource(item.resourceId)"
                        @keydown.space.stop
                    >
                        <ImageAttachmentView
                            :attachment="item.attachment"
                            compact
                        />
                    </button>
                    <div class="resource-info">
                        <strong :title="item.names.join('、')">
                            {{ item.attachment.name || '未命名图片' }}
                        </strong>
                        <span>
                            {{ item.messageIds.size }} 条消息 ·
                            {{ item.count }} 次引用
                        </span>
                        <span
                            class="resource-state"
                            :title="
                                tasks.states[item.resourceId]?.error ||
                                summaries.get(item.resourceId)?.sourceUrl
                            "
                            :class="{
                                warning: resourceState(item.resourceId).warning,
                            }"
                        >
                            {{ status(item.resourceId) }}
                        </span>
                    </div>
                </div>
            </template>
        </RecycleScroller>
    </section>
</template>
<script setup lang="ts">
import { Download, SquareCheckBig, Trash2 } from '@lucide/vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import ImageAttachmentView from '@/components/common/ImageAttachmentView.vue';
import { useResourcePanelStore } from '@/stores/editor/resourcePanelStore';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useResourceSummaries } from '@/composables/resources/useResourceSummaries';
import { resolveImageResourceState } from '@/editor/imageResourceState';
const panel = useResourcePanelStore();
const tasks = useResourceTasksStore();
const windows = useWindowStore();
const { summaries, reading, readError } = useResourceSummaries(() => panel.resources.map(item => item.resourceId));
function resourceState(id: string) {
    return resolveImageResourceState({ resource: summaries.value.get(id), task: tasks.states[id], reading: reading.value, readError: readError.value });
}
function status(id: string) {
    const state = resourceState(id);
    return state.status === 'error' ? `下载失败：${state.error || '请重试'}` : state.label;
}
</script>
<style scoped>
.resource-panel {
    min-height: 0;
}
.resource-total {
    font-size: 12px;
    color: var(--text-muted);
}
.resource-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
    font-size: 12px;
    border-bottom: 1px solid var(--border-color);
}
.resource-toolbar > span {
    color: var(--text-muted);
    margin-right: auto;
}
.resource-help,
.resource-feedback {
    margin: 0;
    padding: 8px 12px;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.6;
}
.resource-feedback {
    color: var(--text-primary);
}
.resource-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
}
.resource-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    box-sizing: border-box;
    cursor: pointer;
}
/* 悬浮描边，选区按面板焦点区分背景。 */
.resource-row:hover {
    background: var(--bg-secondary);
    outline-offset: -1px;
    outline: 1px solid var(--active-accent);
}
.resource-row.is-selected.is-active {
    background: var(--selection-bg);
}
.resource-row.is-selected:not(.is-active) {
    background: var(--inactive-selection-bg);
}
.resource-row:focus-visible,
.resource-thumbnail:focus-visible {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}
.resource-thumbnail {
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    width: 70px;
    height: 60px;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: 3px;
}
.resource-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    font-size: 11px;
    color: var(--text-muted);
}
.resource-info strong {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
}
.resource-info > * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.resource-state.warning {
    color: var(--color-warning);
}
.ui-icon {
    width: 16px;
    height: 16px;
}

.action-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    color: var(--icon-color);
    display: flex;
    align-items: center;
    justify-content: center;
}
.action-button:hover {
    background: var(--hover-bg);
}
</style>
