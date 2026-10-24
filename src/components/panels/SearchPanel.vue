<template>
    <div
        ref="panelRef"
        class="panel"
        v-command-scope="{ area: 'panel', panel: 'search' }"
    >
        <div class="panel-header">
            <div class="header-title">
                <h3>搜索与筛选</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="
                    searchStore.isAdvancedExpanded =
                        !searchStore.isAdvancedExpanded
                "
                :title="
                    searchStore.isAdvancedExpanded
                        ? '收起高级筛选'
                        : '展开高级筛选'
                "
            >
                <FunnelXIcon
                    v-if="searchStore.isAdvancedExpanded"
                    class="ui-icon"
                />
                <FunnelIcon v-else class="ui-icon" />
            </button>
        </div>

        <div ref="controlsRef" class="search-controls" :style="controlsStyle">
            <div class="search-input-wrapper">
                <input
                    ref="searchInputRef"
                    v-model="searchStore.quickSearch"
                    type="text"
                    placeholder="搜索消息内容..."
                    class="form-control main-search-input"
                    :aria-invalid="Boolean(searchStore.contentError)"
                    :aria-describedby="
                        searchStore.contentError
                            ? 'content-search-error'
                            : undefined
                    "
                />
                <button
                    class="icon-button regex-toggle"
                    :class="{ 'is-active': searchStore.contentRegex }"
                    :aria-pressed="searchStore.contentRegex"
                    aria-label="启用正则"
                    title="启用正则"
                    @click="
                        searchStore.contentRegex = !searchStore.contentRegex
                    "
                >
                    <RegexIcon class="ui-icon" />
                </button>
            </div>

            <transition name="slide">
                <div
                    v-if="searchStore.isAdvancedExpanded"
                    class="advanced-wrapper"
                >
                    <div class="advanced-options">
                        <div class="form-group">
                            <label>备注</label>
                            <div class="search-input-wrapper">
                                <input
                                    class="form-control main-search-input"
                                    v-model="searchStore.filter.note"
                                    type="text"
                                    placeholder="搜索消息备注..."
                                    :aria-invalid="
                                        Boolean(searchStore.noteError)
                                    "
                                    :aria-describedby="
                                        searchStore.noteError
                                            ? 'note-search-error'
                                            : undefined
                                    "
                                />

                                <button
                                    class="icon-button regex-toggle"
                                    :class="{
                                        'is-active': searchStore.noteRegex,
                                    }"
                                    :aria-pressed="searchStore.noteRegex"
                                    aria-label="启用正则"
                                    title="启用正则"
                                    @click="
                                        searchStore.noteRegex =
                                            !searchStore.noteRegex
                                    "
                                >
                                    <RegexIcon class="ui-icon" />
                                </button>
                            </div>
                            <p
                                v-if="searchStore.noteError"
                                id="note-search-error"
                                class="search-error"
                                role="alert"
                            >
                                备注正则无效：{{ searchStore.noteError }}
                            </p>
                        </div>
                        <div class="form-group">
                            <label>角色名</label>
                            <MultiTagSelect
                                v-model="searchStore.filter.playerName"
                                :options="playerNameOptions"
                                placeholder="可下拉选择或手动输入，回车确认"
                            />
                        </div>
                        <div class="form-group">
                            <label>账号</label>
                            <MultiTagSelect
                                v-model="searchStore.filter.account"
                                :options="accountOptions"
                                placeholder="可下拉选择或手动输入，回车确认"
                            />
                        </div>
                        <div class="form-group">
                            <label>身份</label>
                            <MultiTagSelect
                                v-model="roleFilterValue"
                                :options="roleOptions"
                                placeholder="可下拉选择身份，支持多选"
                            />
                        </div>

                        <div class="form-group">
                            <label>开始时间</label>
                            <PopoverDatePicker
                                v-model="searchStore.filter.timeStart"
                                placeholder="选择开始日期"
                            />
                        </div>
                        <div class="form-group">
                            <label>结束时间</label>
                            <PopoverDatePicker
                                v-model="searchStore.filter.timeEnd"
                                placeholder="选择结束日期"
                            />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <div class="boolean-filter-grid">
                                    <div class="form-group boolean-filter-item">
                                        <label>场外</label>
                                        <PopoverSelect
                                            v-model="searchStore.filter.isOoc"
                                            :options="booleanOptions"
                                        />
                                    </div>
                                    <div class="form-group boolean-filter-item">
                                        <label>指令</label>
                                        <PopoverSelect
                                            v-model="
                                                searchStore.filter.isCommand
                                            "
                                            :options="booleanOptions"
                                        />
                                    </div>
                                    <div class="form-group boolean-filter-item">
                                        <label>包含图片</label>
                                        <PopoverSelect
                                            v-model="
                                                searchStore.filter.hasImage
                                            "
                                            :options="booleanOptions"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </div>

        <div
            class="resize-handle resize-handle-y"
            title="拖拽调整筛选区高度，双击恢复自适应"
            @mousedown="startFilterResize"
            @dblclick="resetFilterHeight"
        ></div>

        <div
            class="search-summary"
            v-if="
                searchStore.searchResults.length > 0 ||
                searchStore.hasActiveFilter
            "
        >
            <span class="count-text">
                找到 {{ searchStore.searchResults.length }} 条消息
            </span>
            <div class="search-actions">
                <button
                    type="button"
                    class="action-button"
                    title="替换选中消息"
                    aria-label="替换选中消息"
                    @click="openReplacement"
                >
                    <Replace class="ui-icon" />
                </button>
                <button
                    class="action-button"
                    :disabled="searchStore.searchResults.length === 0"
                    @click="selectAllMatches"
                    title="全选"
                >
                    <SquareCheckBig class="ui-icon" />
                </button>
                <button
                    class="action-button action-button-warning"
                    :disabled="
                        activeContext.selectedMessageIds.value.size === 0
                    "
                    @click="deleteSelectedMessages"
                    title="删除"
                >
                    <Trash2 class="ui-icon" />
                </button>
            </div>
        </div>

        <div
            ref="resultsRef"
            class="results-container"
            tabindex="0"
            aria-label="搜索结果"
            @focus="windowStore.setFocus('search')"
        >
            <div
                v-if="searchStore.searchResults.length === 0"
                class="panel-empty-hint"
            >
                {{
                    searchStore.hasSearchError
                        ? '正则表达式错误：'
                        : searchStore.hasActiveFilter
                          ? '未找到匹配的消息'
                          : '输入关键词开始搜索'
                }}
                {{ searchStore.contentError }}
            </div>

            <DynamicScroller
                v-else
                ref="scrollerRef"
                :items="searchStore.searchResults"
                :min-item-size="62"
                key-field="messageId"
                class="scroller"
            >
                <template #default="{ item: msg, index, active }">
                    <DynamicScrollerItem
                        :item="msg"
                        :active="active"
                        :size-dependencies="[msg.content, msg.playerName]"
                        :data-index="index"
                    >
                        <div
                            class="result-item"
                            :class="{
                                'is-selected':
                                    activeContext.selectedMessageIds.value.has(
                                        msg.messageId,
                                    ),
                                'is-active':
                                    windowStore.currentActiveWindow.windowId ===
                                    'search',
                            }"
                            @click="handleItemClick($event, msg.messageId)"
                        >
                            <div class="result-meta">
                                <span class="result-name">
                                    {{ msg.playerName || '未知角色' }}
                                </span>
                                <span
                                    v-if="uiStore.showTime"
                                    class="result-time"
                                >
                                    {{ formatDate(msg.time) }}
                                </span>
                            </div>
                            <div class="result-content">
                                {{ truncate(msg.content, 60) }}
                            </div>
                            <button
                                type="button"
                                class="action-button result-jump"
                                title="跳转到此消息"
                                aria-label="跳转到此消息"
                                @click.stop="jumpToMessage(msg.messageId)"
                            >
                                <CornerDownRight class="ui-icon" />
                            </button>
                        </div>
                    </DynamicScrollerItem>
                </template>
            </DynamicScroller>
        </div>
    </div>
</template>

<script setup lang="ts">
import { vCommandScope } from '@/directives/commandScope';
import {
    CornerDownRight,
    FunnelIcon,
    FunnelXIcon,
    RegexIcon,
    Replace,
    SquareCheckBig,
    Trash2,
} from '@lucide/vue';
import { computed, nextTick, ref, watch, type CSSProperties } from 'vue';
import { buildIdentityStats } from '@/editor/identity';
import { useActiveContext } from '@/composables/application/useActiveContext';
import { formatDate } from '@/utils/date';
import { useCommandDispatcher } from '@/composables/application/useCommandDispatcher';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useSearchStore } from '@/stores/editor/searchStore';
import { useLogStore } from '@/stores/project/logStore';
import { useUiStore } from '@/stores/ui/uiStore';
import MultiTagSelect from '@/components/common/MultiTagSelect.vue';
import type { SelectOption } from '@/components/common/MultiTagSelect.vue';
import PopoverSelect from '@/components/common/PopoverSelect.vue';
import type { PopoverOption } from '@/components/common/PopoverSelect.vue';
import PopoverDatePicker from '@/components/common/PopoverDatePicker.vue';
import type { ColorMode } from '@/types/style';
import { isRoleType, type RoleType } from '@/types/log';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const windowStore = useWindowStore();
const activeContext = useActiveContext('search');
const searchStore = useSearchStore();
const logStore = useLogStore();
const uiStore = useUiStore();
const { dispatch } = useCommandDispatcher();
const searchInputRef = ref<HTMLInputElement | null>(null);

watch(
    () => searchStore.focusRequested,
    async (requested) => {
        if (!requested) return;
        await nextTick();
        if (!searchInputRef.value) return;
        searchInputRef.value.focus();
        searchInputRef.value.select();
        searchStore.focusRequested = false;
    },
    { immediate: true, flush: 'post' },
);

const playerNameOptions = computed<SelectOption[]>(() =>
    buildIdentityOptions('playerName'),
);
const accountOptions = computed<SelectOption[]>(() =>
    buildIdentityOptions('account'),
);

function buildIdentityOptions(mode: ColorMode): SelectOption[] {
    const stats = buildIdentityStats(logStore.allMessages, mode);
    return Array.from(stats.entries()).map(([label, data]) => ({
        label,
        count: data.count,
    }));
}

const roleOptions = computed<SelectOption[]>(() => {
    const counts = new Map<RoleType, number>();
    for (const message of logStore.allMessages) {
        const role = message.role || 'pl';
        counts.set(role, (counts.get(role) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([role, count]) => ({
        label: roleLabels[role],
        value: role,
        count,
    }));
});

const roleLabels: Record<RoleType, string> = {
    pl: '玩家',
    gm: '主持人',
    npc: 'NPC',
    ob: '观众',
    bot: '骰子',
    unknown: '其他',
};

const roleFilterValue = computed<string[]>({
    get: () => searchStore.filter.role,
    set: (value) => {
        searchStore.filter.role = value.filter(isRoleType);
    },
});

const booleanOptions: PopoverOption<boolean | undefined>[] = [
    { label: 'ALL', value: undefined },
    { label: '是', value: true },
    { label: '否', value: false },
];

// --- 筛选区高度拖拽 ---
const FILTER_MIN_HEIGHT = 100;
const panelRef = ref<HTMLElement | null>(null);
const controlsRef = ref<HTMLElement | null>(null);

const controlsStyle = computed<CSSProperties | undefined>(() => {
    const maxHeight = uiStore.searchFilterMaxHeight;
    return maxHeight
        ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' }
        : undefined;
});

function startFilterResize(e: MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = controlsRef.value?.offsetHeight ?? 0;
    const maxHeightLimit = Math.max(
        FILTER_MIN_HEIGHT,
        (panelRef.value?.clientHeight ?? 600) - 140,
    );
    let frameId: number | null = null;
    let pendingHeight = startHeight;

    function applyPendingHeight() {
        frameId = null;
        uiStore.searchFilterMaxHeight = pendingHeight;
    }

    function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientY - startY;
        pendingHeight = Math.min(
            maxHeightLimit,
            Math.max(FILTER_MIN_HEIGHT, startHeight + delta),
        );
        if (frameId === null) {
            frameId = requestAnimationFrame(applyPendingHeight);
        }
    }

    function onMouseUp() {
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
            applyPendingHeight();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function resetFilterHeight() {
    uiStore.searchFilterMaxHeight = null;
}

// 展开高级筛选时恢复完整展示：旧的高度限制（拖拽残留）不应裁剪新内容
watch(
    () => searchStore.isAdvancedExpanded,
    (expanded) => {
        if (expanded && uiStore.searchFilterMaxHeight !== null) {
            uiStore.searchFilterMaxHeight = null;
        }
    },
);

const resultsRef = ref<HTMLElement | null>(null);

function jumpToMessage(msgId: string) {
    windowStore.setFocus('search');
    dispatch('jump', { msgId });
}

function handleItemClick(event: MouseEvent, msgId: string) {
    resultsRef.value?.focus({ preventScroll: true });
    windowStore.setFocus('search');

    dispatch('select', {
        event,
        msgId,
        messages: searchStore.searchResults,
    });
}

function selectAllMatches() {
    windowStore.setFocus('search');
    dispatch('selectAll');
}

function openReplacement() {
    windowStore.setFocus('search');
    dispatch('replace');
}

function deleteSelectedMessages() {
    windowStore.setFocus('search');
    dispatch('delete');
}

const truncate = (str: string, len: number) => {
    return str.length > len ? str.substring(0, len) + '...' : str;
};
</script>

<style scoped>
.form-row > .form-group {
    flex: 1 1 0;
    min-width: 0;
}

.search-controls {
    flex-shrink: 0;
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    z-index: 2;
}

.search-input-wrapper {
    position: relative;
    display: flex;
}

.main-search-input {
    flex: 1;
    min-width: 0;
    padding-right: 32px;
}

.regex-toggle {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 4px;
    width: 20px;
    height: 20px;
    padding: 0;
}

.regex-toggle .ui-icon {
    width: 14px;
    height: 14px;
}

.regex-toggle:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.regex-toggle.is-active {
    border-color: var(--active-accent);
    background: var(--selection-bg);
    color: var(--text-primary);
}

.form-control[aria-invalid='true'] {
    border-color: var(--active-accent);
}

.icon-button {
    background: none;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--icon-color);
}

.advanced-options {
    margin-top: 12px;
    padding-left: 0px;
    background: var(--bg-secondary);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    z-index: 2;
}

.form-row {
    display: flex;
    gap: 10px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.boolean-filter-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.boolean-filter-item {
    margin: 0;
}

.boolean-filter {
    background-color: transparent;
}

.search-summary {
    flex-shrink: 0;
    padding: 4px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-secondary);
}

.search-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.search-actions .text-button {
    font-size: 12px;
    line-height: normal;
    padding: 2px 6px;
}

.count-text {
    font-size: 12px;
    color: var(--text-secondary);
}

.results-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-wrap: anywhere;
}

.scroller {
    flex: 1;
    height: 100%;
}

.result-item {
    position: relative;
    padding: 10px 10px 10px 8px;
    cursor: pointer;
}

.result-item:hover {
    background: var(--bg-secondary);
    outline-offset: -1px;
    outline: 1px solid var(--active-accent);
}

.result-item.is-selected.is-active {
    background: var(--selection-bg);
}

.result-item.is-selected:not(.is-active) {
    background: var(--inactive-selection-bg);
}

.result-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
}

.result-name {
    font-weight: bold;
    color: var(--active-accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.result-content {
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.4;
}

.result-jump {
    position: absolute;
    right: 6px;
    bottom: 6px;
    opacity: 0;
    pointer-events: none;
}

.result-item:hover .result-jump,
.result-item.is-selected .result-jump,
.result-item:focus-within .result-jump {
    opacity: 1;
    pointer-events: auto;
}

.results-container:focus-visible,
.result-jump:focus-visible {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}

@media (hover: none) {
    .result-jump {
        opacity: 1;
        pointer-events: auto;
    }
}

.result-time {
    color: var(--text-muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 动画 */
.advanced-wrapper {
    display: grid;
    grid-template-rows: 1fr;
    transition:
        grid-template-rows 0.25s ease,
        opacity 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
    grid-template-rows: 0fr;
    opacity: 0;
}

.advanced-wrapper .advanced-options {
    min-height: 0;
    overflow: hidden;
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
