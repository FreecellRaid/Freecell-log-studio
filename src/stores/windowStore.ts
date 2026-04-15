import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSelectionStore } from '@/stores/selectionStore';
import type {
    SplitMode,
    SplitDirection,
    SplitPaneState,
    PanePosition,
} from '@/types/layout';
import { generateSplitWindowId } from '@/types/layout';
// TODO: 以后要改一下这里的逻辑，防止可能的循环依赖

type WindowName =
    | 'chunkList'
    | 'identity'
    | 'search'
    | 'exportFormat'
    | 'ruleEditor'
    | 'inspector'
    | 'chunkView'
    | 'defaultView'
    | 'exportPreview'
    | 'help';

type WindowType = 'panel' | 'view' | 'modal';

interface WindowInstance {
    windowId: string;
    windowName: WindowName;
    windowType: WindowType;
    originalId?: string; // 原始业务 ID，分屏时用于获取真正的 chunkId/formatId
}
type FocusTarget = string;

function windowStore() {
    const selectionStore = useSelectionStore();
    const openWindows = ref<Map<string, WindowInstance>>(new Map());
    const focusStack = ref<FocusTarget[]>([]);
    const activeFocus = computed(() => {
        return focusStack.value[focusStack.value.length - 1] || 'defaultView';
    });
    const activeLeftPanelName = ref<WindowName>('chunkList');
    const leftSidebarVisible = ref(true);
    const rightSidebarVisible = ref(false);
    const isHelpOpen = ref(false);
    const splitMode = ref<SplitMode>('single');
    const splitDirection = ref<SplitDirection>('horizontal');
    const splitPanes = ref<[SplitPaneState, SplitPaneState | null]>([
        {
            viewType: 'defaultView',
            viewId: 'defaultView',
            windowId: 'defaultView',
        },
        null,
    ]);
    const splitSizes = ref<[number, number]>([50, 50]);

    function createWindowInstance(
        windowId: string,
        windowName: WindowName,
        windowType: WindowType,
        originalId?: string,
    ): WindowInstance {
        return {
            windowId,
            windowName,
            windowType,
            originalId: originalId ?? windowId,
        };
    }

    // 聚焦到一个目标
    function setFocus(target: FocusTarget) {
        // 先移除已有的相同目标
        const index = focusStack.value.findIndex((t) => t === target);

        if (index !== -1) {
            focusStack.value.splice(index, 1);
        }

        focusStack.value.push(target);
        if (focusStack.value.length > 5) {
            focusStack.value.shift();
        }
    }

    // 注册并打开一个窗口
    function registerWindow(win: WindowInstance) {
        if (!openWindows.value.has(win.windowId)) {
            if (!win.originalId) {
                win.originalId = win.windowId;
            }
            openWindows.value.set(win.windowId, win);
        }
        setFocus(win.windowId);
    }

    // 关闭并注销一个窗口
    function unregisterWindow(windowId: string) {
        const winToClose = openWindows.value.get(windowId);
        // 获取将要关闭窗口的 originalId
        const targetOriginalId = winToClose?.originalId || windowId;
        openWindows.value.delete(windowId);
        const index = focusStack.value.findIndex((t) => t === windowId);
        const isOriginalIdStillInUse = Array.from(
            openWindows.value.values(),
        ).some((w) => w.originalId === targetOriginalId);

        // 只有当所有同源窗口都被关闭时，才清空 selectionStore 中的状态
        if (!isOriginalIdStillInUse) {
            selectionStore.clearSelection(targetOriginalId);
        }

        if (index !== -1) {
            focusStack.value.splice(index, 1);
        }
    }

    // 切换左侧面板内容
    function setLeftPanel(name: WindowName) {
        if (activeLeftPanelName.value && activeLeftPanelName.value !== name) {
            unregisterWindow(activeLeftPanelName.value);
        }

        activeLeftPanelName.value = name;
        leftSidebarVisible.value = true;
        registerWindow(createWindowInstance(name, name, 'panel'));
    }

    // 折叠/展开左侧边栏
    function toggleLeftSidebar() {
        leftSidebarVisible.value = !leftSidebarVisible.value;

        if (leftSidebarVisible.value) {
            registerWindow(
                createWindowInstance(
                    activeLeftPanelName.value,
                    activeLeftPanelName.value,
                    'panel',
                ),
            );
        } else {
            unregisterWindow(activeLeftPanelName.value);
        }
    }

    // 折叠/展开右侧边栏 (Inspector)
    function toggleRightSidebar() {
        rightSidebarVisible.value = !rightSidebarVisible.value;
        if (rightSidebarVisible.value) {
            registerWindow(
                createWindowInstance('inspector', 'inspector', 'panel'),
            );
        } else {
            unregisterWindow('inspector');
        }
    }

    // 切换到场景编辑视图
    function setActiveChunk(chunkId: string) {
        // 注销当前所有类型为 'view' 的 chunkView，防止selection残留
        openWindows.value.forEach((win) => {
            if (win.windowName === 'chunkView' && win.originalId !== chunkId) {
                unregisterWindow(win.windowId);
            }
        });

        if (chunkId) {
            registerWindow(createWindowInstance(chunkId, 'chunkView', 'view'));
        } else {
            setFocus('defaultView');
        }
    }

    // 切换导出预览
    function openExportPreview(formatId: string) {
        registerWindow(createWindowInstance(formatId, 'exportPreview', 'view'));
    }

    function toggleExportPreview(formatId: string) {
        const isActive = activeFocus.value === formatId;
        if (isActive) {
            unregisterWindow(formatId);
        } else {
            registerWindow(
                createWindowInstance(formatId, 'exportPreview', 'view'),
            );
            setFocus(formatId);
        }
    }

    const currentActiveWindow = computed((): WindowInstance => {
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const target = focusStack.value[i];
            const win = openWindows.value.get(target);
            if (win) {
                return win;
            }
        }
        const defaultWin = openWindows.value.get('defaultView');
        return (
            defaultWin ??
            createWindowInstance('defaultView', 'defaultView', 'view')
        );
    });

    const currentActiveView = computed((): WindowInstance => {
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const target = focusStack.value[i];
            const win = openWindows.value.get(target);
            if (win && win.windowType === 'view') {
                return win;
            }
        }
        const defaultWin = openWindows.value.get('defaultView');
        return (
            defaultWin ??
            createWindowInstance('defaultView', 'defaultView', 'view')
        );
    });

    function isInSplitMode(): boolean {
        return splitMode.value === 'double';
    }

    function getActivePanePosition(): 'left' | 'right' | null {
        if (splitMode.value !== 'double') return null;
        const activeId = activeFocus.value;
        if (splitPanes.value[0]?.windowId === activeId) return 'left';
        if (splitPanes.value[1]?.windowId === activeId) return 'right';
        return null;
    }

    // 打开帮助弹窗
    function openHelpDocument() {
        isHelpOpen.value = true;
        setFocus('help');
    }
    function closeHelpDocument() {
        isHelpOpen.value = false;
        if (activeFocus.value === 'help') {
            focusStack.value.pop();
        }
    }

    const isWindowOpen = (windowId: string) => openWindows.value.has(windowId);
    const isWindowFocused = (windowId: string) =>
        activeFocus.value === windowId;

    function enterSplitMode(
        rightViewType: 'chunkView' | 'exportPreview',
        rightViewId: string,
    ) {
        if (splitMode.value === 'double') {
            exitSplitMode();
        }

        const currentView = currentActiveView.value;
        if (currentView.windowName === 'defaultView') return false;

        const leftOriginalId = currentView.originalId ?? currentView.windowId;

        const leftPane: SplitPaneState = {
            viewType: currentView.windowName as 'chunkView' | 'exportPreview',
            viewId: leftOriginalId,
            windowId: generateSplitWindowId('left', leftOriginalId),
        };

        // 构建右侧 pane
        const rightPane: SplitPaneState = {
            viewType: rightViewType,
            viewId: rightViewId,
            windowId: generateSplitWindowId('right', rightViewId),
        };

        // 注销左侧原始窗口，注册带前缀的新窗口
        unregisterWindow(currentView.windowId);
        registerWindow(
            createWindowInstance(
                leftPane.windowId,
                leftPane.viewType,
                'view',
                leftOriginalId,
            ),
        );
        registerWindow(
            createWindowInstance(
                rightPane.windowId,
                rightViewType,
                'view',
                rightViewId,
            ),
        );

        splitPanes.value = [leftPane, rightPane];
        splitMode.value = 'double';

        return true;
    }

    // 退出分屏模式，回到单视图
    function exitSplitMode() {
        if (splitMode.value !== 'double') return;

        const [leftPane, rightPane] = splitPanes.value;
        if (!rightPane) return;

        // 确定哪个 pane 是当前活跃的（通过焦点栈判断）
        const activePaneWindowId = activeFocus.value;
        const activePane =
            [leftPane, rightPane].find(
                (p) => p.windowId === activePaneWindowId,
            ) || leftPane;
        unregisterWindow(leftPane.windowId);
        unregisterWindow(rightPane.windowId);

        // 恢复活跃 pane 的原始窗口（不带前缀）
        if (activePane.viewType !== 'defaultView') {
            registerWindow(
                createWindowInstance(
                    activePane.viewId,
                    activePane.viewType,
                    'view',
                    activePane.viewId,
                ),
            );
        }
        splitPanes.value = [
            {
                viewType: 'defaultView',
                viewId: 'defaultView',
                windowId: 'defaultView',
            },
            null,
        ];
        splitMode.value = 'single';
    }

    // 切换指定 pane 显示的视图
    function setPaneView(
        paneIndex: 0 | 1,
        viewType: 'chunkView' | 'exportPreview',
        viewId: string,
    ) {
        if (splitMode.value !== 'double') return;

        const pane = splitPanes.value[paneIndex];
        if (!pane) return;

        const position: PanePosition = paneIndex === 0 ? 'left' : 'right';
        const newWindowId = generateSplitWindowId(position, viewId);

        unregisterWindow(pane.windowId);
        registerWindow(
            createWindowInstance(newWindowId, viewType, 'view', viewId),
        );

        splitPanes.value[paneIndex] = {
            viewType,
            viewId,
            windowId: newWindowId,
        };
    }

    // 关闭指定 pane
    function closePane() {
        if (splitMode.value !== 'double') return;
        exitSplitMode();
    }

    // 获取指定 pane 的原始 viewId
    function getPaneViewId(paneIndex: 0 | 1): string | null {
        if (splitMode.value !== 'double') return null;
        return splitPanes.value[paneIndex]?.viewId ?? null;
    }

    // 分屏预览
    function splitWithPreview(formatId: string) {
        const currentView = currentActiveView.value;
        if (currentView.windowName === 'defaultView') return false;
        return enterSplitMode('exportPreview', formatId);
    }

    return {
        openWindows,
        focusStack,
        activeFocus,
        activeLeftPanelName,
        leftSidebarVisible,
        rightSidebarVisible,
        currentActiveWindow,
        currentActiveView,
        isHelpOpen,
        splitMode,
        splitDirection,
        splitPanes,
        splitSizes,

        setFocus,
        registerWindow,
        unregisterWindow,
        setLeftPanel,
        toggleLeftSidebar,
        toggleRightSidebar,
        isWindowOpen,
        isWindowFocused,
        setActiveChunk,
        openExportPreview,
        toggleExportPreview,
        openHelpDocument,
        closeHelpDocument,
        enterSplitMode,
        exitSplitMode,
        setPaneView,
        closePane,
        getPaneViewId,
        splitWithPreview,
        isInSplitMode,
        getActivePanePosition,
    };
}

export const useWindowStore = defineStore('window', windowStore);
