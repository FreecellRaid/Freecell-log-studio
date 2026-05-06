<template>
    <div class="panel" @pointerdown="windowStore.setFocus('search')">
        <div class="panel-header">
            <div class="header-title">
                <h3>搜索与筛选</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="searchStore.clearAllFilters"
                title="清空筛选"
            >
                <RefreshCcw class="ui-icon" />
            </button>
        </div>

        <div class="search-controls">
            <div class="search-input-wrapper">
                <input
                    v-model="searchStore.quickSearch"
                    type="text"
                    placeholder="搜索消息内容..."
                    class="form-control main-search-input"
                />
                <button
                    class="expand-toggle icon-interactive"
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

            <transition name="slide">
                <div
                    v-if="searchStore.isAdvancedExpanded"
                    class="advanced-options"
                >
                    <div class="form-group">
                        <label>角色名</label>
                        <input
                            class="form-control"
                            v-model="searchStore.filter.playerName"
                            type="text"
                            placeholder="匹配角色..."
                        />
                    </div>
                    <div class="form-group">
                        <label>账号</label>
                        <input
                            class="form-control"
                            v-model="searchStore.filter.account"
                            type="text"
                            placeholder="匹配账号..."
                        />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <input
                            class="form-control"
                            v-model="searchStore.filter.note"
                            type="text"
                            placeholder="匹配备注..."
                        />
                    </div>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label>身份</label>
                            <select
                                v-model="searchStore.filter.role"
                                class="form-control"
                            >
                                <option :value="undefined">ALL</option>
                                <option value="pl">玩家</option>
                                <option value="gm">主持人</option>
                                <option value="npc">NPC</option>
                                <option value="ob">观众</option>
                                <option value="bot">骰子</option>
                                <option value="unknown">其他</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <div class="boolean-filter-grid">
                                <div class="form-group boolean-filter-item">
                                    <label>场外</label>
                                    <select
                                        v-model="isOocFilterValue"
                                        class="form-control"
                                    >
                                        <option value="">ALL</option>
                                        <option value="true">是</option>
                                        <option value="false">否</option>
                                    </select>
                                </div>
                                <div class="form-group boolean-filter-item">
                                    <label>指令</label>
                                    <select
                                        v-model="isCommandFilterValue"
                                        class="form-control"
                                    >
                                        <option value="">ALL</option>
                                        <option value="true">是</option>
                                        <option value="false">否</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>
        </div>

        <div
            class="search-summary"
            v-if="
                searchStore.searchResults.length > 0 ||
                searchStore.hasActiveFilter
            "
        >
            <span class="count-text">
                找到 {{ searchStore.searchResults.length }} 条结果
            </span>
            <div class="search-actions">
                <button
                    class="btn-primary"
                    :disabled="!jumpTarget"
                    @click="dispatch('jump')"
                >
                    跳转
                </button>
                <button
                    class="btn-primary"
                    :disabled="searchStore.searchResults.length === 0"
                    @click="selectAllMatches"
                >
                    全选
                </button>
            </div>
        </div>

        <div class="results-container">
            <div
                v-if="searchStore.searchResults.length === 0"
                class="panel-empty-hint"
            >
                {{
                    searchStore.hasActiveFilter
                        ? '未找到匹配的消息'
                        : '输入关键词开始搜索'
                }}
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
                                <span class="result-time">
                                    {{ formatDate(msg.time) }}
                                </span>
                            </div>
                            <div class="result-content">
                                {{ truncate(msg.content, 60) }}
                            </div>
                        </div>
                    </DynamicScrollerItem>
                </template>
            </DynamicScroller>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FunnelIcon, FunnelXIcon, RefreshCcw } from '@lucide/vue';
import { computed } from 'vue';
import { useActiveContext } from '@/composables/useActiveContext';
import type { Message } from '@/types/log';
import { formatDate } from '@/utils/date';
import { useCommandDispatcher } from '@/composables/useCommandDispatcher';
import { useWindowStore } from '@/stores/windowStore';
import { useSearchStore } from '@/stores/searchStore';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

const windowStore = useWindowStore();
const activeContext = useActiveContext('search');
const searchStore = useSearchStore();
const { dispatch } = useCommandDispatcher();

const isOocFilterValue = computed<string>({
    get: () => booleanFilterToString(searchStore.filter.isOoc),
    set: (value) => {
        searchStore.filter.isOoc = stringToBooleanFilter(value);
    },
});
const isCommandFilterValue = computed<string>({
    get: () => booleanFilterToString(searchStore.filter.isCommand),
    set: (value) => {
        searchStore.filter.isCommand = stringToBooleanFilter(value);
    },
});
const jumpTarget = computed<Message | null>(() => {
    const selectedIds = activeContext.selectedMessageIds.value;
    const selectedTarget = searchStore.searchResults.find((msg) =>
        selectedIds.has(msg.messageId),
    );
    return selectedTarget || searchStore.searchResults[0] || null;
});

function handleItemClick(event: MouseEvent, msgId: string) {
    windowStore.setFocus('search');

    dispatch('select', {
        event,
        msgId,
        messages: searchStore.searchResults,
    });
}

function selectAllMatches() {
    dispatch('selectAll', {
        messages: searchStore.searchResults,
    });
}

function booleanFilterToString(value: boolean | undefined) {
    if (value === undefined) return '';
    return value ? 'true' : 'false';
}

function stringToBooleanFilter(value: string) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}

const truncate = (str: string, len: number) => {
    return str.length > len ? str.substring(0, len) + '...' : str;
};
</script>

<style scoped>
.search-controls {
    flex-shrink: 0;
    padding: 12px 12px 0px 12px;
    border-bottom: 1px solid var(--border-color);
    z-index: 2;
}

.search-input-wrapper {
    display: flex;
    gap: 8px;
}

.main-search-input {
    flex: 1;
}

.expand-toggle {
    background: none;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--icon-color);
}

.expand-toggle :deep(.ui-icon) {
    width: 14px;
    height: 14px;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.boolean-filter-item {
    margin: 0;
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

.btn-primary {
    font-size: 12px;
    color: var(--text-muted);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
}

.btn-primary:hover {
    background-color: var(--hover-bg);
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
}

.scroller {
    flex: 1;
    height: 100%;
}

.result-item {
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
}

.result-content {
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.4;
}

.result-time {
    color: var(--text-muted);
    font-size: 12px;
}

/* 动画 */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease;
    max-height: 200px;
    overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    padding-top: 0;
    padding-bottom: 0;
}
</style>
