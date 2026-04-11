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
    | 'exportPreview';

export interface WindowInstance {
    windowId: string;
    windowName: WindowName;
}

export type FocusTarget =
    | { type: 'window'; id: string }
    | { type: 'input'; id: 'input' }
    | { type: 'modal'; id: 'modal' };

// 侧边栏面板布局常量
export const PANEL_MIN_WIDTH = 150;
export const PANEL_MAX_WIDTH = 600;

function uiStore() {
    const leftPanelWidth = ref(232);
    // 深色模式
    const isDarkMode = ref(false);
    const followSystem = ref(true);

    function detectSystemDark() {
        return (
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
        );
    }
    function handleSystemThemeChange(e: MediaQueryListEvent) {
        if (followSystem.value) {
            isDarkMode.value = e.matches;
        }
    }
    function initTheme() {
        if (followSystem.value) {
            isDarkMode.value = detectSystemDark();
        }
        if (window.matchMedia) {
            window
                .matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', handleSystemThemeChange);
        }
    }
    function toggleDarkMode() {
        followSystem.value = false;
        isDarkMode.value = !isDarkMode.value;
    }
    function setFollowSystem(val: boolean) {
        followSystem.value = val;
        if (val) {
            isDarkMode.value = detectSystemDark();
        }
    }
    // 显示隐藏消息
    const showHidden = ref(false);
    function toggleShowHidden() {
        showHidden.value = !showHidden.value;
    }

    const exportPreviewAlwaysWhite = ref(false);
    function toggleExportPreviewAlwaysWhite() {
        exportPreviewAlwaysWhite.value = !exportPreviewAlwaysWhite.value;
    }

    //  窗口管理
    const openWindows = ref<Map<string, WindowInstance>>(new Map());
    const focusStack = ref<FocusTarget[]>([]);
    const activeFocus = computed(() => {
        return (
            focusStack.value[focusStack.value.length - 1] || {
                type: 'window',
                id: 'defaultView',
            }
        );
    });
    const activeLeftPanelName = ref<WindowName>('chunkList');
    // 侧边栏显隐逻辑
    const leftSidebarVisible = ref(true);
    const rightSidebarVisible = ref(false);

    // 聚焦到一个目标
    function setFocus(target: FocusTarget) {
        // 先移除已有的相同目标
        const index = focusStack.value.findIndex(
            (t) => t.id === target.id && t.type === target.type,
        );
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
        setFocus({ type: 'window', id: win.windowId });
    }

    // 关闭并注销一个窗口
    function unregisterWindow(windowId: string) {
        openWindows.value.delete(windowId);
        const index = focusStack.value.findIndex(
            (t) => t.id === windowId && t.type === 'window',
        );
        if (index !== -1) {
            focusStack.value.splice(index, 1);
        }
    }

    // 切换左侧面板内容
    function setLeftPanel(name: WindowName) {
        activeLeftPanelName.value = name;
        leftSidebarVisible.value = true;
        // 侧边栏切换视为一次焦点注册
        registerWindow({ windowId: name, windowName: name });
    }

    // 折叠/展开左侧边栏
    function toggleLeftSidebar() {
        leftSidebarVisible.value = !leftSidebarVisible.value;
        if (leftSidebarVisible.value) {
            // 展开时，恢复该面板的焦点
            setFocus({ type: 'window', id: activeLeftPanelName.value });
        } else {
            // 折叠时，从焦点栈移除该面板
            const index = focusStack.value.findIndex(
                (t) => t.id === activeLeftPanelName.value,
            );
            if (index !== -1) focusStack.value.splice(index, 1);
        }
    }

    // 折叠/展开右侧边栏 (Inspector)
    function toggleRightSidebar() {
        rightSidebarVisible.value = !rightSidebarVisible.value;
        if (rightSidebarVisible.value) {
            registerWindow({ windowId: 'inspector', windowName: 'inspector' });
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
            });
        } else {
            setFocus({ type: 'window', id: 'defaultView' });
        }
    }

    // 切换导出预览
    function openExportPreview(formatId: string) {
        registerWindow({
            windowId: formatId, // 使用formatId 作为 ID
            windowName: 'exportPreview',
        });
    }

    function toggleExportPreview(formatId: string) {
        const isActive = activeFocus.value.id === formatId;

        if (isActive) {
            unregisterWindow(formatId);
        } else {
            registerWindow({
                windowId: formatId,
                windowName: 'exportPreview',
            });
            setFocus({ type: 'window', id: formatId });
        }
    }

    // 获取当前活跃的 View 信息 (用于 MainWorkspace 渲染)
    const VIEW_WINDOW_NAMES: WindowName[] = [
        'chunkView',
        'defaultView',
        'exportPreview',
    ];

    const currentActiveView = computed(() => {
        // 从焦点栈顶向下查找，防止焦点为input/modal时找不到view
        for (let i = focusStack.value.length - 1; i >= 0; i--) {
            const target = focusStack.value[i];
            if (target.type === 'window') {
                const win = openWindows.value.get(target.id);
                if (win && VIEW_WINDOW_NAMES.includes(win.windowName)) {
                    return win;
                }
            }
        }
        // 如果栈里没有任何视图，返回默认工作台
        return (
            openWindows.value.get('defaultView') ||
            ({
                windowId: 'defaultView',
                windowName: 'defaultView',
            } as WindowInstance)
        );
    });
    // 帮助弹窗
    const isHelpOpen = ref(false);
    function openHelpDocument() {
        isHelpOpen.value = true;
        setFocus({ type: 'modal', id: 'modal' });
    }
    function closeHelpDocument() {
        isHelpOpen.value = false;
        if (activeFocus.value.type === 'modal') {
            focusStack.value.pop();
        }
    }

    const isWindowOpen = (windowId: string) => openWindows.value.has(windowId);
    const isWindowFocused = (windowId: string) =>
        activeFocus.value.id === windowId;

    return {
        leftPanelWidth,
        openWindows,
        focusStack,
        activeFocus,
        activeLeftPanelName,
        leftSidebarVisible,
        rightSidebarVisible,
        exportPreviewAlwaysWhite,
        currentActiveView,
        isDarkMode,
        followSystem,
        showHidden,
        isHelpOpen,

        setFocus,
        registerWindow,
        unregisterWindow,
        toggleExportPreviewAlwaysWhite,
        setLeftPanel,
        toggleLeftSidebar,
        toggleRightSidebar,
        toggleDarkMode,
        initTheme,
        setFollowSystem,
        toggleShowHidden,
        isWindowOpen,
        isWindowFocused,
        setActiveChunk,
        openExportPreview,
        toggleExportPreview,
        openHelpDocument,
        closeHelpDocument,
    };
}

export const useUiStore = defineStore('ui', uiStore);
