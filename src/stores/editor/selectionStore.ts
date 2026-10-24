import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';
import { selectionScopeKey, type SelectionScope } from '@/types/selection';
import type { LogDocument } from '@/types/log';

type SelectionType = 'message' | 'chunk' | 'rule' | 'format' | 'resource';

interface SelectionState {
    scope: SelectionScope;
    selectionType: SelectionType;
    ids: Set<string>;
    anchorId?: string;
    lastSelectedId?: string;
}

function SelectionStore() {
    const activeScope = ref<SelectionScope>({ kind: 'none' });
    function activateScope(scope: SelectionScope) {
        activeScope.value = { ...scope };
    }
    const selections = ref<Map<string, SelectionState>>(new Map());

    function _getKey(scope: SelectionScope, type: SelectionType): string {
        return `${selectionScopeKey(scope)}::${type}`;
    }

    function getState(
        scope: SelectionScope,
        type: SelectionType,
    ): SelectionState {
        if (scope.kind === 'none') {
            return {
                scope,
                selectionType: type,
                ids: new Set(),
            };
        }

        const key = _getKey(scope, type);
        if (!selections.value.has(key)) {
            return createState(scope, type);
        }
        return selections.value.get(key)!;
    }

    function createState(
        scope: SelectionScope,
        type: SelectionType,
    ): SelectionState {
        const key = _getKey(scope, type);
        const newState: SelectionState = {
            scope,
            selectionType: type,
            ids: new Set(),
        };
        const newMap = new Map(selections.value);
        newMap.set(key, newState);
        selections.value = newMap;
        return selections.value.get(key)!;
    }

    function select(
        scope: SelectionScope,
        type: SelectionType,
        ids: string | string[],
        isMulti: boolean = false,
    ) {
        const state = getState(scope, type);
        const idList = Array.isArray(ids) ? ids : [ids];

        /**
         * 选中一个或多个 ID
         * @param isMulti - true: 添加到现有选区；false: 替换现有选区
         */
        const newIds = isMulti ? new Set(state.ids) : new Set<string>();

        idList.forEach((id) => newIds.add(id));
        state.ids = newIds;

        if (idList.length > 0) {
            state.lastSelectedId = idList[idList.length - 1];
            if (!isMulti) {
                state.anchorId = state.lastSelectedId;
            }
        }
    }

    function clearSelection(scope: SelectionScope, type?: SelectionType) {
        if (scope.kind === 'none') return;

        const newMap = new Map(selections.value);
        let hasChanges = false;

        if (type) {
            const key = _getKey(scope, type);
            // 使用 delete 彻底移除键值对，防止内存泄露
            if (newMap.has(key)) {
                newMap.delete(key);
                hasChanges = true;
            }
        } else {
            for (const key of newMap.keys()) {
                if (key.startsWith(`${selectionScopeKey(scope)}::`)) {
                    newMap.delete(key);
                    hasChanges = true;
                }
            }
        }
        if (hasChanges) {
            selections.value = newMap;
        }
    }

    function clearAllSelections() {
        selections.value = new Map();
        activeScope.value = { kind: 'none' };
    }

    function getSelectedIds(
        scope: SelectionScope,
        type: SelectionType,
    ): Set<string> {
        return getState(scope, type).ids;
    }

    function getSelectedItems<T>(
        scope: SelectionScope,
        type: SelectionType,
        sourceItems: T[],
        idGetter: (item: T) => string,
    ): T[] {
        const ids = getSelectedIds(scope, type);
        if (ids.size === 0) return [];
        return sourceItems.filter((item) => ids.has(idGetter(item)));
    }

    function selectNext(
        scope: SelectionScope,
        type: SelectionType,
        items: any[],
        idGetter: (item: any) => string = (i: any) => i.id,
    ) {
        const state = getState(scope, type);
        if (!state.lastSelectedId || items.length === 0) return;

        const currentIndex = items.findIndex(
            (item) => idGetter(item) === state.lastSelectedId,
        );
        if (currentIndex === -1 || currentIndex === items.length - 1) return;

        const nextItem = items[currentIndex + 1];
        if (nextItem) {
            const nextId = idGetter(nextItem);
            const newIds = new Set(state.ids);
            newIds.add(nextId);
            state.ids = newIds;
            state.lastSelectedId = nextId;
        }
    }

    function selectPrevious(
        scope: SelectionScope,
        type: SelectionType,
        items: any[],
        idGetter: (item: any) => string = (i: any) => i.id,
    ) {
        const state = getState(scope, type);
        if (!state.lastSelectedId || items.length === 0) return;

        const currentIndex = items.findIndex(
            (item) => idGetter(item) === state.lastSelectedId,
        );
        if (currentIndex <= 0) return;

        const prevItem = items[currentIndex - 1];
        if (prevItem) {
            const prevId = idGetter(prevItem);
            const newIds = new Set(state.ids);
            newIds.add(prevId);
            state.ids = newIds;
            state.lastSelectedId = prevId;
        }
    }

    /**
     * 根据属性选中下一个匹配项
     * @param scope 窗口ID
     * @param type 类型
     * @param items 原始数据列表
     * @param propertyName 匹配的属性键名
     * @param idGetter 获取ID的方法
     */
    function selectNextByProperty<T>(
        scope: SelectionScope,
        type: SelectionType,
        items: T[],
        propertyName: keyof T,
        idGetter: (item: T) => string,
    ) {
        const state = getState(scope, type);
        const lastId = state.lastSelectedId;
        if (!lastId || items.length === 0) return;

        const currentIndex = items.findIndex((i) => idGetter(i) === lastId);
        if (currentIndex === -1) return;

        const currentItem = items[currentIndex];
        const targetValue = currentItem[propertyName];

        // 从当前索引之后开始查找第一个匹配属性值的项
        const nextMatch = items.slice(currentIndex + 1).find((item) => {
            return item[propertyName] === targetValue;
        });

        if (nextMatch) {
            const nextId = idGetter(nextMatch);
            const newIds = new Set(state.ids);
            newIds.add(nextId);
            state.ids = newIds;
            state.lastSelectedId = nextId;
        }
    }

    function selectAll(
        scope: SelectionScope,
        type: SelectionType,
        items: any[],
        idGetter: (item: any) => string = (i: any) => i.id,
    ) {
        const state = getState(scope, type);
        const allIds = items.map((item) => idGetter(item));
        state.ids = new Set(allIds);

        if (allIds.length > 0) {
            state.lastSelectedId = allIds[allIds.length - 1];
        }
    }

    // cmd/sft 点选
    function handleEventSelection<T>(
        scope: SelectionScope,
        type: SelectionType,
        event: MouseEvent,
        targetId: string,
        items: T[],
        idGetter: (item: T) => string,
    ) {
        const state = getState(scope, type);
        const isMulti = event.ctrlKey || event.metaKey;
        const isRange = event.shiftKey;

        if (isRange) {
            window.getSelection()?.removeAllRanges();

            const anchorId = state.anchorId || state.lastSelectedId;
            if (!anchorId) {
                select(scope, type, targetId, false);
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
                    select(scope, type, targetId, false);
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
            select(scope, type, targetId, false);
            state.anchorId = targetId;
        }
    }

    // 选区由业务数据的生命周期清理，关闭视图或面板不删除仍有效的选区。
    function reconcile(documents: readonly LogDocument[]) {
        const chunks = new Map(
            documents
                .flatMap((doc) => doc.chunks)
                .map((chunk) => [chunk.chunkId, chunk]),
        );
        const messageIds = new Set(
            [...chunks.values()].flatMap((chunk) =>
                chunk.messages.map((message) => message.messageId),
            ),
        );
        for (const [key, state] of selections.value) {
            if (
                state.scope.kind === 'scene' &&
                !chunks.has(state.scope.chunkId)
            ) {
                selections.value.delete(key);
                continue;
            }
            const valid =
                state.selectionType === 'chunk'
                    ? new Set(chunks.keys())
                    : state.selectionType === 'message'
                      ? state.scope.kind === 'scene'
                          ? new Set(
                                chunks
                                    .get(state.scope.chunkId)!
                                    .messages.map(
                                        (message) => message.messageId,
                                    ),
                            )
                          : messageIds
                      : null;
            if (!valid) continue;
            if ([...state.ids].some((id) => !valid.has(id)))
                state.ids = new Set(
                    [...state.ids].filter((id) => valid.has(id)),
                );
            if (state.anchorId && !valid.has(state.anchorId))
                state.anchorId = undefined;
            if (state.lastSelectedId && !valid.has(state.lastSelectedId))
                state.lastSelectedId = undefined;
        }
        if (
            activeScope.value.kind === 'scene' &&
            !chunks.has(activeScope.value.chunkId)
        )
            activeScope.value = { kind: 'none' };
    }

    return {
        activeScope: readonly(activeScope),
        activateScope,
        reconcile,
        selections,
        getState,
        createState,
        select,
        clearSelection,
        clearAllSelections,
        getSelectedIds,
        getSelectedItems,
        selectNext,
        selectPrevious,
        selectNextByProperty,
        selectAll,
        handleEventSelection,
    };
}

export const useSelectionStore = defineStore('selection', SelectionStore);
