import { defineStore } from 'pinia';
import { ref } from 'vue';

type SelectionType = 'message' | 'chunk' | 'rule' | 'format';

interface SelectionState {
    selectionType: SelectionType;
    ids: Set<string>;
    anchorId?: string;
    lastSelectedId?: string;
}

function SelectionStore() {
    const selections = ref<Map<string, SelectionState>>(new Map());

    function _getKey(windowId: string, type: SelectionType): string {
        return `${windowId}::${type}`;
    }

    function getState(windowId: string, type: SelectionType): SelectionState {
        if (windowId === 'defaultView') {
            return {
                selectionType: type,
                ids: new Set(),
            };
        }

        const key = _getKey(windowId, type);
        if (!selections.value.has(key)) {
            return createState(windowId, type);
        }
        return selections.value.get(key)!;
    }

    function createState(
        windowId: string,
        type: SelectionType,
    ): SelectionState {
        const key = _getKey(windowId, type);
        const newState: SelectionState = {
            selectionType: type,
            ids: new Set(),
        };
        const newMap = new Map(selections.value);
        newMap.set(key, newState);
        selections.value = newMap;
        return newState;
    }

    function select(
        windowId: string,
        type: SelectionType,
        ids: string | string[],
        isMulti: boolean = false,
    ) {
        const state = getState(windowId, type);
        const idList = Array.isArray(ids) ? ids : [ids];

        // 重新实例化 Set 确保 Vue 能捕捉到依赖变化
        const newIds = isMulti ? new Set(state.ids) : new Set<string>();

        idList.forEach((id) => newIds.add(id));
        state.ids = newIds;

        if (idList.length > 0) {
            state.lastSelectedId = idList[idList.length - 1];
            // 如果是单选，更新锚点
            if (!isMulti) {
                state.anchorId = state.lastSelectedId;
            }
        }
    }

    function deselect(
        windowId: string,
        type: SelectionType,
        ids: string | string[],
    ) {
        const state = getState(windowId, type);
        const idList = Array.isArray(ids) ? ids : [ids];
        const newIds = new Set(state.ids);

        idList.forEach((id) => newIds.delete(id));
        state.ids = newIds;

        // 如果最后选中的元素被移除了，重置 lastSelectedId
        if (state.lastSelectedId && idList.includes(state.lastSelectedId)) {
            state.lastSelectedId = Array.from(newIds).pop();
        }
    }

    function clearSelection(windowId: string, type?: SelectionType) {
        if (windowId === 'defaultView') return;

        const newMap = new Map(selections.value);
        let hasChanges = false;

        if (type) {
            const key = _getKey(windowId, type);
            // 使用 delete 彻底移除键值对，防止内存泄露
            if (newMap.has(key)) {
                newMap.delete(key);
                hasChanges = true;
            }
        } else {
            for (const key of newMap.keys()) {
                if (key.startsWith(`${windowId}::`)) {
                    newMap.delete(key);
                    hasChanges = true;
                }
            }
        }
        if (hasChanges) {
            selections.value = newMap;
        }
    }

    function getSelectedIds(
        windowId: string,
        type: SelectionType,
    ): Set<string> {
        return getState(windowId, type).ids;
    }

    function getSelectedItems<T>(
        windowId: string,
        type: SelectionType,
        sourceItems: T[],
        idGetter: (item: T) => string,
    ): T[] {
        const ids = getSelectedIds(windowId, type);
        if (ids.size === 0) return [];
        return sourceItems.filter((item) => ids.has(idGetter(item)));
    }

    function selectNext(
        windowId: string,
        type: SelectionType,
        items: any[],
        idGetter: (item: any) => string = (i: any) => i.id,
    ) {
        const state = getState(windowId, type);
        if (!state.lastSelectedId || items.length === 0) return;

        const currentIndex = items.findIndex(
            (item) => idGetter(item) === state.lastSelectedId,
        );
        if (currentIndex === -1 || currentIndex === items.length - 1) return;

        // 向下选中下一个元素
        const nextItem = items[currentIndex + 1];
        if (nextItem) {
            const nextId = idGetter(nextItem);
            const newIds = new Set(state.ids);
            newIds.add(nextId);
            state.ids = newIds;
            state.lastSelectedId = nextId;
        }
    }

    function selectAll(
        windowId: string,
        type: SelectionType,
        items: any[],
        idGetter: (item: any) => string = (i: any) => i.id,
    ) {
        const state = getState(windowId, type);
        const allIds = items.map((item) => idGetter(item));
        state.ids = new Set(allIds);

        if (allIds.length > 0) {
            state.lastSelectedId = allIds[allIds.length - 1];
        }
    }

    // cmd/sft 点选
    function handleEventSelection<T>(
        windowId: string,
        type: SelectionType,
        event: MouseEvent,
        targetId: string,
        items: T[],
        idGetter: (item: T) => string,
    ) {
        const state = getState(windowId, type);
        const isMulti = event.ctrlKey || event.metaKey;
        const isRange = event.shiftKey;

        if (isRange) {
            window.getSelection()?.removeAllRanges();

            const anchorId = state.anchorId || state.lastSelectedId;
            if (!anchorId) {
                select(windowId, type, targetId, false);
                state.anchorId = targetId;
            } else {
                const anchorIndex = items.findIndex(
                    (i) => idGetter(i) === anchorId,
                );
                const targetIndex = items.findIndex(
                    (i) => idGetter(i) === targetId,
                );

                if (anchorIndex !== -1 && targetIndex !== -1) {
                    const start = Math.min(anchorIndex, targetIndex);
                    const end = Math.max(anchorIndex, targetIndex);

                    const rangeIds = items.slice(start, end + 1).map(idGetter);

                    const newIds = isMulti
                        ? new Set(state.ids)
                        : new Set<string>();
                    rangeIds.forEach((id) => newIds.add(id));

                    state.ids = newIds;
                    state.lastSelectedId = targetId;
                } else {
                    select(windowId, type, targetId, false);
                }
            }
        } else if (isMulti) {
            const newIds = new Set(state.ids);
            if (newIds.has(targetId)) {
                newIds.delete(targetId);
            } else {
                newIds.add(targetId);
            }
            state.ids = newIds;
            state.lastSelectedId = targetId;
            state.anchorId = targetId;
        } else {
            select(windowId, type, targetId, false);
            state.anchorId = targetId;
        }
    }

    return {
        selections,
        getState,
        createState,
        select,
        deselect,
        clearSelection,
        getSelectedIds,
        getSelectedItems,
        selectNext,
        selectAll,
        handleEventSelection,
    };
}

export const useSelectionStore = defineStore('selection', SelectionStore);
