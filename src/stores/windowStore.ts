import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSelectionStore } from '@/stores/selectionStore';
import type {
    WindowName,
    WindowInstance,
    SplitMode,
    SplitDirection,
} from '@/types/layout';
import { generateId } from '@/utils/id';

function windowStore() {
    const selectionStore = useSelectionStore();
    const openWindows = ref<Map<string, WindowInstance>>(new Map());
    const focusStack = ref<string[]>([]);
    const activeFocus = computed(() => {
        return focusStack.value[focusStack.value.length - 1] || 'defaultView';
    });
    const activeLeftPanelName = ref<WindowName>('chunkList');
    const leftSidebarVisible = ref(true);
    const rightSidebarVisible = ref(false);
    const isHelpOpen = ref(false);

    const splitPanes = ref<[WindowInstance, WindowInstance | null]>([
        {
            windowId: 'defaultView',
            windowName: 'defaultView',
            windowType: 'view',
            originalId: 'defaultView',
        },
        null,
    ]);
    const splitMode = ref<SplitMode>('single');
    const splitSizes = ref<[number, number]>([50, 50]);
    const splitDirection = ref<SplitDirection>('horizontal');

    // 聚焦到一个目标
    function setFocus(target: string) {
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
        registerWindow({
            windowId: name,
            windowName: name,
            windowType: 'panel',
            originalId: name,
        });
    }

    // 折叠/展开左侧边栏
    function toggleLeftSidebar() {
        leftSidebarVisible.value = !leftSidebarVisible.value;

        if (leftSidebarVisible.value) {
            registerWindow({
                windowId: activeLeftPanelName.value,
                windowName: activeLeftPanelName.value,
                windowType: 'panel',
                originalId: activeLeftPanelName.value,
            });
        } else {
            unregisterWindow(activeLeftPanelName.value);
        }
    }

    // 折叠/展开右侧边栏 (Inspector)
    function toggleRightSidebar() {
        rightSidebarVisible.value = !rightSidebarVisible.value;
        if (rightSidebarVisible.value) {
            registerWindow({
                windowId: 'inspector',
                windowName: 'inspector',
                windowType: 'panel',
                originalId: 'inspector',
            });
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
            registerWindow({
                windowId: generateId(),
                windowName: 'chunkView',
                windowType: 'view',
                originalId: chunkId,
            });
        } else {
            setFocus('defaultView');
        }
    }

    // 切换导出预览
    function openExportPreview(formatId: string) {
        const currentView = currentActiveView.value;
        // 如果当前是空白默认页，直接原地替换
        if (currentView.windowName === 'defaultView') {
            const newWindowId = generateId();
            registerWindow({
                windowId: newWindowId,
                windowName: 'exportPreview',
                windowType: 'view',
                originalId: formatId,
            });
            setFocus(newWindowId);
            return;
        }

        // 如果当前活跃窗口本身就是预览窗口，直接在当前位置切换模板
        if (currentView.windowName === 'exportPreview') {
            if (splitMode.value === 'double') {
                const activePos = getActivePanePosition();
                setPaneView(
                    activePos === 'left' ? 0 : 1,
                    'exportPreview',
                    formatId,
                );
            } else {
                // 单屏模式下的预览切换
                const newWindowId = generateId();
                unregisterWindow(currentView.windowId);
                registerWindow({
                    windowId: newWindowId,
                    windowName: 'exportPreview',
                    windowType: 'view',
                    originalId: formatId,
                });
                setFocus(newWindowId);
            }
            return;
        }
        if (splitMode.value === 'double') {
            // 已在双屏：找到不活跃的那一侧并替换
            const activePos = getActivePanePosition();
            const targetPaneIndex = activePos === 'left' ? 1 : 0; // 选相反的那一侧
            setPaneView(targetPaneIndex, 'exportPreview', formatId);
        } else {
            // 单屏模式：直接开启分屏预览
            enterSplitMode('exportPreview', formatId);
        }
    }

    function toggleExportPreview(formatId: string) {
        const isActive = activeFocus.value === formatId;
        if (isActive) {
            unregisterWindow(formatId);
        } else {
            const newWindowId = generateId();
            registerWindow({
                windowId: newWindowId,
                windowName: 'exportPreview',
                windowType: 'view',
                originalId: formatId,
            });
            setFocus(newWindowId);
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
            defaultWin ?? {
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
                originalId: 'defaultView',
            }
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
            defaultWin ?? {
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
                originalId: 'defaultView',
            }
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
        rightWindowName: 'chunkView' | 'exportPreview',
        rightOriginalId: string,
    ) {
        if (splitMode.value === 'double') {
            exitSplitMode();
        }

        const currentView = currentActiveView.value;
        if (currentView.windowName === 'defaultView') return false;

        const leftPane: WindowInstance = {
            windowId: currentView.windowId,
            originalId: currentView.originalId,
            windowName: currentView.windowName,
            windowType: 'view',
        };

        const newRightWindowId = generateId();
        const rightPane: WindowInstance = {
            windowId: newRightWindowId,
            originalId: rightOriginalId,
            windowName: rightWindowName,
            windowType: 'view',
        };
        registerWindow(rightPane);

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
        if (activePane.windowName !== 'defaultView') {
            registerWindow(activePane);
        }
        splitPanes.value = [
            {
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
                originalId: 'defaultView',
            },
            null,
        ];
        splitMode.value = 'single';
    }

    // 切换指定 pane 显示的视图
    function setPaneView(
        paneIndex: 0 | 1,
        windowName: 'chunkView' | 'exportPreview',
        originalId: string,
    ) {
        if (splitMode.value !== 'double') return;
        const pane = splitPanes.value[paneIndex];
        if (!pane) return;

        unregisterWindow(pane.windowId);
        const newWindowId = generateId();
        const newWindow: WindowInstance = {
            windowId: newWindowId,
            windowName: windowName,
            windowType: 'view',
            originalId: originalId,
        };

        registerWindow(newWindow);
        splitPanes.value[paneIndex] = newWindow;
    }

    // 关闭指定 pane
    function closePane() {
        if (splitMode.value !== 'double') return;
        exitSplitMode();
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
        isInSplitMode,
    };
}

export const useWindowStore = defineStore('window', windowStore);
