import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import type {
    PanelWindowName,
    ModalWindowName,
    WindowInstance,
    PaneDirection,
    WorkspacePane,
} from '@/types/window';
import {
    getWindowTargetId,
    isWorkspaceView,
    windowDefinitions,
} from '@/types/window';
import { generateId } from '@/utils/id';

function windowStore() {
    const selectionStore = useSelectionStore();
    const defaultWindow: WindowInstance = {
        windowId: 'defaultView',
        windowName: 'defaultView',
    };
    // 默认页始终注册，作为没有业务视图时的统一兜底。
    const openWindows = ref<Map<string, WindowInstance>>(
        new Map([[defaultWindow.windowId, defaultWindow]]),
    );
    const focusStack = ref<string[]>([]);
    const pendingMessageReveal = ref<{
        requestId: string;
        windowId: string;
        chunkId: string;
        messageId: string;
    } | null>(null);
    const activeFocus = computed(() => {
        return currentActiveWindow.value.windowId;
    });
    const selectedLeftPanel = ref<PanelWindowName>('chunkList');
    const layoutInitialized = ref(false);
    const openWindowIds = computed(() => new Set(openWindows.value.keys()));

    // 布局只保存引用，窗口实例统一从 openWindows 获取。
    const paneWindowIds = ref<[string, string | null]>(['defaultView', null]);
    const paneSizes = ref<[number, number]>([50, 50]);
    const paneDirection = ref<PaneDirection>('horizontal');
    const activePaneIndex = ref<0 | 1>(0);

    // 聚焦 view 时更新布局；面板和弹窗的焦点不会改变活动 pane。
    function setFocus(target: string) {
        const win = openWindows.value.get(target);
        if (!win) return;

        if (isWorkspaceView(win)) {
            const paneIndex = paneWindowIds.value.indexOf(target);
            if (paneIndex === 0 || paneIndex === 1) {
                activePaneIndex.value = paneIndex;
            } else {
                paneWindowIds.value[activePaneIndex.value] = target;
            }
        }
        focusStack.value = focusStack.value.filter(
            (id) => id !== target && openWindows.value.has(id),
        );
        focusStack.value.push(target);
    }

    // 注册并打开一个窗口。
    function registerWindow(win: WindowInstance) {
        if (windowDefinitions[win.windowName].singleton) {
            win = { ...win, windowId: win.windowName };
        }
        if (!openWindows.value.has(win.windowId)) {
            openWindows.value.set(win.windowId, win);
        }
        setFocus(win.windowId);
    }

    function getFallbackViewId() {
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const id = focusStack.value[i];
            const win = openWindows.value.get(id);
            if (win && isWorkspaceView(win) && id !== 'defaultView') return id;
        }
        return (
            Array.from(openWindows.value.values()).find(
                (win) => isWorkspaceView(win) && win.windowId !== 'defaultView',
            )?.windowId ?? 'defaultView'
        );
    }

    // 关闭实例，同时维护布局引用、焦点历史和同源选择状态。
    function unregisterWindow(windowId: string) {
        const win = openWindows.value.get(windowId);
        if (!win || windowId === 'defaultView') return;
        const wasFocused = activeFocus.value === windowId;
        openWindows.value.delete(windowId);
        if (pendingMessageReveal.value?.windowId === windowId)
            clearPendingMessageReveal();
        focusStack.value = focusStack.value.filter((id) => id !== windowId);

        const paneIndex = paneWindowIds.value.indexOf(windowId);
        if (paneIndex !== -1) {
            const otherId = paneWindowIds.value[paneIndex === 0 ? 1 : 0];
            paneWindowIds.value = [otherId ?? getFallbackViewId(), null];
            activePaneIndex.value = 0;
        }

        if (
            !Array.from(openWindows.value.values()).some(
                (other) => getWindowTargetId(other) === getWindowTargetId(win),
            )
        ) {
            selectionStore.clearSelection(getWindowTargetId(win));
        }
        if (wasFocused) {
            const fallback = currentActiveWindow.value;
            setFocus(
                isWorkspaceView(fallback)
                    ? currentActiveView.value.windowId
                    : fallback.windowId,
            );
        }
    }

    function createView(
        windowName: 'chunkView' | 'exportPreview',
        originalId: string,
    ): WindowInstance {
        const windowId = generateId();
        return windowName === 'chunkView'
            ? {
                  windowId,
                  windowName,
                  target: { kind: 'chunk', chunkId: originalId },
              }
            : {
                  windowId,
                  windowName,
                  target: { kind: 'format', formatId: originalId },
              };
    }

    function replacePaneView(
        paneIndex: 0 | 1,
        windowName: 'chunkView' | 'exportPreview',
        originalId: string,
    ) {
        const previousId = paneWindowIds.value[paneIndex];
        const previous = previousId
            ? openWindows.value.get(previousId)
            : undefined;
        if (
            previous?.windowName === windowName &&
            getWindowTargetId(previous) === originalId
        ) {
            setFocus(previous.windowId);
            return;
        }
        const win = createView(windowName, originalId);
        // 先挂接新实例，再关闭旧实例，避免布局收起或同源选择被提前清理。
        openWindows.value.set(win.windowId, win);
        paneWindowIds.value[paneIndex] = win.windowId;
        setFocus(win.windowId);
        if (previousId) unregisterWindow(previousId);
    }

    function registerPanel(name: PanelWindowName) {
        registerWindow({
            windowId: name,
            windowName: name,
        });
    }

    // 清理指向已不存在分块的 chunkView 窗口（数据清空/替换后遗留的孤儿视图）
    function pruneOrphanChunkViews(hasChunk: (chunkId: string) => boolean) {
        let hasValidView = false;
        for (const win of Array.from(openWindows.value.values())) {
            if (win.windowName !== 'chunkView') continue;
            if (hasChunk(win.target.chunkId)) {
                hasValidView = true;
            } else {
                unregisterWindow(win.windowId);
            }
        }
        return hasValidView;
    }

    // 选择左侧面板；若当前面板已打开，则在原位置切换内容
    function selectLeftPanel(name: PanelWindowName) {
        const previousPanel = selectedLeftPanel.value;
        const wasOpen = isWindowOpen(previousPanel);

        if (previousPanel !== name && wasOpen) {
            unregisterWindow(previousPanel);
        }

        selectedLeftPanel.value = name;
        if (wasOpen) registerPanel(name);
    }

    function openLeftPanel(name: PanelWindowName = selectedLeftPanel.value) {
        if (name !== selectedLeftPanel.value) selectLeftPanel(name);
        if (!isWindowOpen(name)) registerPanel(name);
    }

    function closeLeftPanel() {
        if (isWindowOpen(selectedLeftPanel.value)) {
            unregisterWindow(selectedLeftPanel.value);
        }
    }

    function toggleLeftPanel() {
        if (isWindowOpen(selectedLeftPanel.value)) closeLeftPanel();
        else openLeftPanel();
    }

    function initializeLayout(isMobile: boolean) {
        if (layoutInitialized.value) return;
        layoutInitialized.value = true;
        if (!isMobile) openLeftPanel();
    }

    function openInspector() {
        registerPanel('inspector');
    }

    function closeInspector() {
        if (isWindowOpen('inspector')) unregisterWindow('inspector');
    }

    function toggleInspector() {
        if (isWindowOpen('inspector')) closeInspector();
        else openInspector();
    }

    // 单屏复用已打开的场景；分屏只替换活动 pane。
    function setActiveChunk(chunkId: string) {
        if (!chunkId) {
            for (const win of Array.from(openWindows.value.values())) {
                if (win.windowName === 'chunkView')
                    unregisterWindow(win.windowId);
            }
            setFocus('defaultView');
            return;
        }
        if (hasSplitView.value) {
            setPaneView(activePaneIndex.value, 'chunkView', chunkId);
            return;
        }
        const existing = Array.from(openWindows.value.values()).find(
            (win) =>
                win.windowName === 'chunkView' &&
                win.target.chunkId === chunkId,
        );
        if (existing) setFocus(existing.windowId);
        else registerWindow(createView('chunkView', chunkId));
        for (const win of Array.from(openWindows.value.values())) {
            if (
                win.windowName === 'chunkView' &&
                win.target.chunkId !== chunkId
            ) {
                unregisterWindow(win.windowId);
            }
        }
    }

    function openExportPreview(formatId: string) {
        const currentView = currentActiveView.value;
        if (currentView.windowName === 'exportPreview') {
            replacePaneView(activePaneIndex.value, 'exportPreview', formatId);
        } else if (hasSplitView.value) {
            setPaneView(
                activePaneIndex.value === 0 ? 1 : 0,
                'exportPreview',
                formatId,
            );
        } else if (currentView.windowName === 'defaultView') {
            replacePaneView(0, 'exportPreview', formatId);
        } else {
            openSplitView('exportPreview', formatId);
        }
    }

    function toggleExportPreview(formatId: string) {
        const previews = Array.from(openWindows.value.values()).filter(
            (win) =>
                win.windowName === 'exportPreview' &&
                win.target.formatId === formatId,
        );
        if (previews.length) {
            previews.forEach((win) => unregisterWindow(win.windowId));
        } else {
            openExportPreview(formatId);
        }
    }

    // 顺序只考虑 modal 之间的聚焦；背景窗口获得焦点不会盖过 modal。
    const openModals = computed(() =>
        Array.from(openWindows.value.values())
            .filter(
                (win) => windowDefinitions[win.windowName].group === 'modal',
            )
            .sort(
                (a, b) =>
                    focusStack.value.indexOf(a.windowId) -
                    focusStack.value.indexOf(b.windowId),
            ),
    );
    const topModal = computed(() => openModals.value.at(-1) ?? null);
    const blockingModal = computed(
        () =>
            [...openModals.value]
                .reverse()
                .find(
                    (win) => windowDefinitions[win.windowName].blocksCommands,
                ) ?? null,
    );

    const currentActiveWindow = computed((): WindowInstance => {
        if (blockingModal.value) return blockingModal.value;
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const target = focusStack.value[i];
            const win = openWindows.value.get(target);
            if (win) {
                return win;
            }
        }
        return currentActiveView.value;
    });

    // 按焦点历史选择 view，供单视图工作区使用；面板和弹窗不改变内容。
    const lastFocusedView = computed((): WindowInstance => {
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const win = openWindows.value.get(focusStack.value[i]);
            if (win && isWorkspaceView(win)) return win;
        }
        return openWindows.value.get('defaultView')!;
    });

    // 工作区活动视图由布局决定，与面板/弹窗焦点历史无关。
    const currentActiveView = computed(
        (): WindowInstance =>
            openWindows.value.get(
                paneWindowIds.value[activePaneIndex.value] ?? 'defaultView',
            ) ?? openWindows.value.get('defaultView')!,
    );

    const hasSplitView = computed(() => paneWindowIds.value[1] !== null);
    const workspacePanes = computed((): WorkspacePane[] =>
        (hasSplitView.value ? ([0, 1] as const) : ([0] as const)).map(
            (paneIndex) => ({
                paneIndex,
                instance:
                    openWindows.value.get(
                        paneWindowIds.value[paneIndex] ?? 'defaultView',
                    ) ?? null,
                isActive: paneIndex === activePaneIndex.value,
            }),
        ),
    );

    function getActivePaneIndex(): 0 | 1 {
        return activePaneIndex.value;
    }

    function openModal(name: ModalWindowName) {
        registerWindow({ windowId: name, windowName: name });
    }

    function closeModal(name: ModalWindowName) {
        unregisterWindow(name);
    }

    function closeTopModal() {
        if (topModal.value) unregisterWindow(topModal.value.windowId);
    }

    function openHelpDocument() {
        openModal('help');
    }
    function closeHelpDocument() {
        closeModal('help');
    }

    const isWindowOpen = (windowId: string) =>
        openWindowIds.value.has(windowId);
    const isWindowFocused = (windowId: string) =>
        activeFocus.value === windowId;

    function openSplitView(
        rightWindowName: 'chunkView' | 'exportPreview',
        rightOriginalId: string,
    ) {
        if (hasSplitView.value) closeSplitView();
        const leftWindowId = currentActiveView.value.windowId;
        if (
            !windowDefinitions[currentActiveView.value.windowName].allowSplit ||
            !windowDefinitions[rightWindowName].allowSplit
        )
            return false;
        const right = createView(rightWindowName, rightOriginalId);
        openWindows.value.set(right.windowId, right);
        paneWindowIds.value = [leftWindowId, right.windowId];
        setFocus(right.windowId);
        return true;
    }

    // 保留实例不经历注销，避免清空其选择状态。
    function closeSplitView(keepWindowId?: string) {
        if (!hasSplitView.value) return;
        const [leftId, rightId] = paneWindowIds.value;
        const requestedId =
            keepWindowId ?? paneWindowIds.value[activePaneIndex.value];
        const keepId = requestedId === rightId ? rightId! : leftId;
        const closingId = keepId === leftId ? rightId! : leftId;
        paneWindowIds.value = [keepId, null];
        activePaneIndex.value = 0;
        unregisterWindow(closingId);
        setFocus(keepId);
    }

    function setPaneView(
        paneIndex: 0 | 1,
        windowName: 'chunkView' | 'exportPreview',
        originalId: string,
    ) {
        if (!hasSplitView.value) return;
        replacePaneView(paneIndex, windowName, originalId);
    }

    function requestMessageReveal(
        chunkId: string,
        messageId: string,
        windowId = currentActiveView.value.windowId,
    ) {
        const win = openWindows.value.get(windowId);
        if (win?.windowName !== 'chunkView' || win.target.chunkId !== chunkId)
            return;
        pendingMessageReveal.value = {
            requestId: generateId(),
            windowId,
            chunkId,
            messageId,
        };
    }

    function clearPendingMessageReveal(requestId?: string) {
        if (!requestId || pendingMessageReveal.value?.requestId === requestId)
            pendingMessageReveal.value = null;
    }

    // 关闭指定 pane，也支持最后一个单屏业务视图。
    function closePane(closingWindowId: string) {
        if (!paneWindowIds.value.includes(closingWindowId)) return;
        unregisterWindow(closingWindowId);
    }

    return {
        openWindows,
        focusStack,
        activeFocus,
        selectedLeftPanel,
        currentActiveWindow,
        openModals,
        topModal,
        blockingModal,
        currentActiveView,
        lastFocusedView,
        workspacePanes,
        paneWindowIds,
        hasSplitView,
        paneDirection,
        paneSizes,
        activePaneIndex,
        pendingMessageReveal,

        setFocus,
        registerWindow,
        unregisterWindow,
        selectLeftPanel,
        openLeftPanel,
        closeLeftPanel,
        toggleLeftPanel,
        initializeLayout,
        openInspector,
        closeInspector,
        toggleInspector,
        isWindowOpen,
        isWindowFocused,
        setActiveChunk,
        pruneOrphanChunkViews,
        openExportPreview,
        toggleExportPreview,
        openModal,
        closeModal,
        closeTopModal,
        openHelpDocument,
        closeHelpDocument,
        openSplitView,
        closeSplitView,
        setPaneView,
        closePane,
        getActivePaneIndex,
        requestMessageReveal,
        clearPendingMessageReveal,
    };
}

export const useWindowStore = defineStore('window', windowStore);
