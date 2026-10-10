import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/project/logStore';
import { matchesMessageFilter } from '@/editor/filter';
import type { MessageFilter, RoleType } from '@/types/log';

function normalizeStringFilter(value: string) {
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
}

// 解析时间过滤值；带 T 时间部分的精确到秒，纯日期作为结束条件时含当天全天
function parseTimeFilterValue(value: string, isEnd: boolean): Date | null {
    // 统一分隔符，Safari 对空格分隔的日期时间解析不可靠
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    // 不完整/越界的输入会解析为 Invalid Date，跳过该条件
    if (Number.isNaN(date.getTime())) return null;
    if (isEnd && !normalized.includes('T')) {
        date.setDate(date.getDate() + 1);
        date.setTime(date.getTime() - 1);
    }
    return date;
}

interface PanelFilterState {
    playerName: string[];
    account: string[];
    note: string;
    role: RoleType[];
    isOoc: boolean | undefined;
    isCommand: boolean | undefined;
    /** 日期（yyyy-mm-dd）或带时间（yyyy-mm-ddThh:mm:ss），空串表示不过滤 */
    timeStart: string;
    timeEnd: string;
}

export const useSearchStore = defineStore('searchPanel', () => {
    const logStore = useLogStore();

    const quickSearch = ref('');
    const isAdvancedExpanded = ref(false);
    const filter = reactive<PanelFilterState>({
        playerName: [],
        account: [],
        note: '',
        role: [],
        isOoc: undefined,
        isCommand: undefined,
        timeStart: '',
        timeEnd: '',
    });

    const normalizedFilter = computed<MessageFilter>(() => {
        const activeFilter: MessageFilter = {};
        const content = normalizeStringFilter(quickSearch.value);
        const note = normalizeStringFilter(filter.note);

        if (content) activeFilter.content = content;
        if (note) activeFilter.note = note;
        if (filter.playerName.length > 0) {
            activeFilter.playerName = [...filter.playerName];
        }
        if (filter.account.length > 0) {
            activeFilter.account = [...filter.account];
        }
        if (filter.role.length > 0) {
            activeFilter.role = [...filter.role];
        }
        if (filter.isOoc !== undefined) activeFilter.isOoc = filter.isOoc;
        if (filter.isCommand !== undefined) {
            activeFilter.isCommand = filter.isCommand;
        }
        if (filter.timeStart) {
            const start = parseTimeFilterValue(filter.timeStart, false);
            if (start) activeFilter.timeStart = start;
        }
        if (filter.timeEnd) {
            const end = parseTimeFilterValue(filter.timeEnd, true);
            if (end) activeFilter.timeEnd = end;
        }

        return activeFilter;
    });

    const hasActiveFilter = computed(
        () => Object.keys(normalizedFilter.value).length > 0,
    );

    const searchResults = computed(() => {
        if (!hasActiveFilter.value) return [];
        return logStore.allMessages.filter((msg) =>
            matchesMessageFilter(msg, normalizedFilter.value),
        );
    });

    function clearAllFilters() {
        quickSearch.value = '';
        filter.playerName = [];
        filter.account = [];
        filter.note = '';
        filter.role = [];
        filter.isOoc = undefined;
        filter.isCommand = undefined;
        filter.timeStart = '';
        filter.timeEnd = '';
    }

    return {
        quickSearch,
        isAdvancedExpanded,
        filter,
        normalizedFilter,
        hasActiveFilter,
        searchResults,
        clearAllFilters,
    };
});
