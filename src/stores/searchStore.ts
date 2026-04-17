import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/logStore';
import { matchesMessageFilter } from '@/editor/filter';
import type { MessageFilter } from '@/types/log';

function normalizeStringFilter(value: MessageFilter['playerName']) {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
}

export const useSearchStore = defineStore('searchPanel', () => {
    const logStore = useLogStore();

    const quickSearch = ref('');
    const isAdvancedExpanded = ref(false);
    const filter = reactive<MessageFilter>({
        playerName: '',
        account: '',
        note: '',
        role: undefined,
        isOoc: undefined,
        isCommand: undefined,
    });

    const normalizedFilter = computed<MessageFilter>(() => {
        const activeFilter: MessageFilter = {};
        const content = normalizeStringFilter(quickSearch.value);
        const playerName = normalizeStringFilter(filter.playerName);
        const account = normalizeStringFilter(filter.account);
        const note = normalizeStringFilter(filter.note);

        if (content) activeFilter.content = content;
        if (playerName) activeFilter.playerName = playerName;
        if (account) activeFilter.account = account;
        if (note) activeFilter.note = note;
        if (filter.role !== undefined) activeFilter.role = filter.role;
        if (filter.isOoc !== undefined) activeFilter.isOoc = filter.isOoc;
        if (filter.isCommand !== undefined) {
            activeFilter.isCommand = filter.isCommand;
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
        filter.playerName = '';
        filter.account = '';
        filter.note = '';
        filter.role = undefined;
        filter.isOoc = undefined;
        filter.isCommand = undefined;
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
