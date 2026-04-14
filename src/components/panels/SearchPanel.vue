<template>
    <div class="panel" @pointerdown="windowStore.setFocus('search')">
        <div class="panel-header">
            <div class="header-title">
                <h3>搜索与筛选</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="clearAllFilters"
                title="清空筛选"
            >
                <RefreshCcw class="ui-icon" />
            </button>
        </div>

        <div class="search-controls">
            <div class="search-input-wrapper">
                <input
                    v-model="quickSearch"
                    type="text"
                    placeholder="搜索消息内容..."
                    class="main-search-input"
                    @keydown.enter="handleSearch"
                />
                <button
                    class="expand-toggle icon-interactive"
                    @click="isAdvancedExpanded = !isAdvancedExpanded"
                    :title="
                        isAdvancedExpanded ? '收起高级筛选' : '展开高级筛选'
                    "
                >
                    <FunnelXIcon v-if="isAdvancedExpanded" class="ui-icon" />
                    <FunnelIcon v-else class="ui-icon" />
                </button>
            </div>

            <transition name="slide">
                <div v-if="isAdvancedExpanded" class="advanced-options">
                    <div class="form-group">
                        <label>角色名</label>
                        <input
                            class="form-group-input"
                            v-model="filter.playerName"
                            type="text"
                            placeholder="匹配角色..."
                        />
                    </div>
                    <div class="form-group">
                        <label>账号</label>
                        <input
                            class="form-group-input"
                            v-model="filter.account"
                            type="text"
                            placeholder="匹配账号..."
                        />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <input
                            class="form-group-input"
                            v-model="filter.note"
                            type="text"
                            placeholder="匹配备注..."
                        />
                    </div>
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label>身份</label>
                            <select v-model="filter.role">
                                <option :value="undefined">ALL</option>
                                <option value="pl">玩家</option>
                                <option value="gm">主持人</option>
                                <option value="npc">NPC</option>
                                <option value="ob">观众</option>
                                <option value="unknown">其他</option>
                            </select>
                        </div>
                        <div class="form-group flex-1">
                            <div class="boolean-filter-grid">
                                <div class="form-group boolean-filter-item">
                                    <label>场外</label>
                                    <select v-model="isOocFilterValue">
                                        <option value="">ALL</option>
                                        <option value="true">是</option>
                                        <option value="false">否</option>
                                    </select>
                                </div>
                                <div class="form-group boolean-filter-item">
                                    <label>指令</label>
                                    <select v-model="isCommandFilterValue">
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
            v-if="searchResults.length > 0 || hasActiveFilter"
        >
            <span class="count-text">
                找到 {{ searchResults.length }} 条结果
            </span>
            <button
                class="btn-primary btn-sm"
                :disabled="searchResults.length === 0"
                @click="selectAllMatches"
            >
                全选
            </button>
        </div>

        <div class="results-container">
            <div v-if="searchResults.length === 0" class="panel-empty-hint">
                {{
                    hasActiveFilter ? '未找到匹配的消息' : '输入关键词开始搜索'
                }}
            </div>
            <div
                v-for="msg in searchResults"
                :key="msg.messageId"
                class="result-item"
                :class="{
                    'is-selected': filterStore.selectedMessageIds.value.has(
                        msg.messageId,
                    ),
                }"
                @click="handleItemClick($event, msg.messageId)"
            >
                <div class="result-meta">
                    <span class="result-name">
                        {{ msg.playerName || '未知角色' }}
                    </span>
                    <span class="result-time">{{ formatDate(msg.time) }}</span>
                </div>
                <div class="result-content">
                    {{ truncate(msg.content, 60) }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FunnelIcon, FunnelXIcon, RefreshCcw } from '@lucide/vue';
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useFilter } from '@/composables/useFilter';
import { matchesMessageFilter } from '@/editor/filter';
import type { MessageFilter } from '@/types/log';
import { formatDate } from '@/utils/date';
import { useCommandDispatcher } from '@/composables/useCommandDispatcher';
import { useWindowStore } from '@/stores/windowStore';

const logStore = useLogStore();
const windowStore = useWindowStore();
const filterStore = useFilter('search');
const { dispatch } = useCommandDispatcher();

// 状态控制
const quickSearch = ref('');
const isAdvancedExpanded = ref(false);
const filter = reactive<MessageFilter>({
    playerName: '',
    account: '',
    note: '',
    time: undefined,
    role: undefined,
    isOoc: undefined,
    isCommand: undefined,
});
const isOocFilterValue = computed<string>({
    get: () => booleanFilterToString(filter.isOoc),
    set: (value) => {
        filter.isOoc = stringToBooleanFilter(value);
    },
});
const isCommandFilterValue = computed<string>({
    get: () => booleanFilterToString(filter.isCommand),
    set: (value) => {
        filter.isCommand = stringToBooleanFilter(value);
    },
});
const normalizedFilter = computed<MessageFilter>(() => {
    const activeFilter: MessageFilter = {};
    const content = normalizeStringFilter(quickSearch.value);
    const playerName = normalizeStringFilter(filter.playerName);
    const account = normalizeStringFilter(filter.account);

    if (content) activeFilter.content = content;
    if (playerName) activeFilter.playerName = playerName;
    if (account) activeFilter.account = account;
    if (filter.role !== undefined) activeFilter.role = filter.role;
    if (filter.isOoc !== undefined) activeFilter.isOoc = filter.isOoc;
    if (filter.isCommand !== undefined)
        activeFilter.isCommand = filter.isCommand;

    return activeFilter;
});

// 是否存在任何过滤条件
const hasActiveFilter = computed(
    () => Object.keys(normalizedFilter.value).length > 0,
);

// 核心过滤逻辑：计算搜索结果
const searchResults = computed(() => {
    if (!hasActiveFilter.value) return [];
    return logStore.allMessages.filter((msg) =>
        matchesMessageFilter(msg, normalizedFilter.value),
    );
});

// 操作方法
function handleSearch() {
    quickSearch.value = quickSearch.value.trim();
}

function handleItemClick(event: MouseEvent, msgId: string) {
    windowStore.setFocus('search');

    dispatch('messageSelect', {
        event,
        msgId,
        messages: searchResults.value, // 将当前计算出的搜索结果快照传给调度器
    });
}

function selectAllMatches() {
    dispatch('selectAll', {
        messages: searchResults.value,
    });
}

const handleKeyDown = (e: KeyboardEvent) => {
    if (windowStore.activeFocus !== 'search') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllMatches();
    }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));

function clearAllFilters() {
    quickSearch.value = '';
    filter.playerName = '';
    filter.account = '';
    filter.note = '';
    filter.role = undefined;
    filter.isOoc = undefined;
    filter.isCommand = undefined;
}

function normalizeStringFilter(value: MessageFilter['playerName']) {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
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
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    z-index: 2;
}

.search-input-wrapper {
    display: flex;
    gap: 8px;
}

.main-search-input {
    flex: 1;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
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
    gap: 10px;
    z-index: 2;
}

.form-row {
    display: flex;
    gap: 10px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-size: 12px;
    color: var(--text-muted);
}

.form-group input,
.form-group select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    outline: none;
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
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
}

.count-text {
    font-size: 12px;
    color: var(--text-secondary);
}

.results-container {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
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

.result-item.is-selected {
    background: var(--selection-bg);
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

@media (max-width: 768px) {
    .search-input-wrapper,
    .form-row {
        flex-direction: column;
    }

    .boolean-filter-grid {
        grid-template-columns: 1fr;
    }
}
</style>
