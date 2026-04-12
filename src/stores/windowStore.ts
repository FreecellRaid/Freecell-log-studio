import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type WindowName =
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

export type WindowType = 'panel' | 'view' | 'modal';

export interface WindowInstance {
    windowId: string;
    windowName: WindowName;
    windowType: WindowType;
}

export type FocusTarget = string;

function windowStore() {
    const openWindows = ref<Map<string, WindowInstance>>(new Map());
    const focusStack = ref<FocusTarget[]>([]);
    const activeFocus = computed(() => {
        return focusStack.value[focusStack.value.length - 1] || 'defaultView';
    });
    const activeLeftPanelName = ref<WindowName>('chunkList');
    const leftSidebarVisible = ref(true);
    const rightSidebarVisible = ref(false);
    const isHelpOpen = ref(false);

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
            openWindows.value.set(win.windowId, win);
        }
        setFocus(win.windowId);
    }

    // 关闭并注销一个窗口
    function unregisterWindow(windowId: string) {
        openWindows.value.delete(windowId);
        const index = focusStack.value.findIndex((t) => t === windowId);
        if (index !== -1) {
            focusStack.value.splice(index, 1);
        }
    }

    // 切换左侧面板内容
    function setLeftPanel(name: WindowName) {
        activeLeftPanelName.value = name;
        leftSidebarVisible.value = true;
        // 侧边栏切换视为一次焦点注册
        registerWindow({
            windowId: name,
            windowName: name,
            windowType: 'panel',
        });
    }

    // 折叠/展开左侧边栏
    function toggleLeftSidebar() {
        leftSidebarVisible.value = !leftSidebarVisible.value;
        if (leftSidebarVisible.value) {
            // 展开时，恢复该面板的焦点
            setFocus(activeLeftPanelName.value);
        } else {
            // 折叠时，从焦点栈移除该面板
            const index = focusStack.value.findIndex(
                (t) => t === activeLeftPanelName.value,
            );
            if (index !== -1) focusStack.value.splice(index, 1);
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
            });
        } else {
            unregisterWindow('inspector');
        }
    }

    // 切换到场景编辑视图
    function setActiveChunk(chunkId: string) {
        if (chunkId) {
            registerWindow({
                windowId: chunkId, // 使用 chunkId 作为 ID
                windowName: 'chunkView',
                windowType: 'view',
            });
        } else {
            setFocus('defaultView');
        }
    }

    // 切换导出预览
    function openExportPreview(formatId: string) {
        registerWindow({
            windowId: formatId, // 使用formatId 作为 ID
            windowName: 'exportPreview',
            windowType: 'view',
        });
    }

    function toggleExportPreview(formatId: string) {
        const isActive = activeFocus.value === formatId;
        if (isActive) {
            unregisterWindow(formatId);
        } else {
            registerWindow({
                windowId: formatId,
                windowName: 'exportPreview',
                windowType: 'view',
            });
            setFocus(formatId);
        }
    }

    const currentActiveWindow = computed(() => {
        const focusId = activeFocus.value;

        if (focusId === 'defaultView') {
            return {
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
            } as WindowInstance;
        }

        if (focusId === 'modal') {
            return {
                windowId: 'help',
                windowName: 'help',
                windowType: 'modal',
            } as WindowInstance;
        }
        const win = openWindows.value.get(focusId);

        return (
            win ||
            ({
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
            } as WindowInstance)
        );
    });

    const currentActiveView = computed(() => {
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const target = focusStack.value[i];
            const win = openWindows.value.get(target);
            if (win && win.windowType === 'view') {
                return win;
            }
        }
        return (
            openWindows.value.get('defaultView') ||
            ({
                windowId: 'defaultView',
                windowName: 'defaultView',
                windowType: 'view',
            } as WindowInstance)
        );
    });

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
    };
}

export const useWindowStore = defineStore('ui', windowStore);
