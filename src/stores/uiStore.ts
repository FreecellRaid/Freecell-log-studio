import { defineStore } from 'pinia';
import { ref } from 'vue';

/** 侧边栏面板布局常量 */
export const PANEL_MIN_WIDTH = 150;
export const PANEL_MAX_WIDTH = 600;

export type FocusArea =
    | 'none'
    | 'input'
    | 'modal'
    | 'chunkList'
    | 'search'
    | 'otherPanel'
    | 'chunkView'
    | 'exportPreview'
    | 'sidebarRight'
    | 'defaultView';

function uiStore() {
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

    // 初始化主题
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

    // 当前正在编辑的分块 ID
    const activeChunkId = ref<string | null>(null);
    const activeLeftPanel = ref('chunks');
    const leftVisible = ref(true);
    const leftPanelWidth = ref(232);
    const rightVisible = ref(false);
    const exportPreviewVisible = ref(false);
    const helpDocumentVisible = ref(false);
    const focusArea = ref<FocusArea>('defaultView');
    const lastActiveView = ref<FocusArea>('defaultView');
    const focusBeforeModal = ref<FocusArea>('defaultView');

    function setActiveChunk(id: string | null) {
        activeChunkId.value = id;
    }

    function setFocusArea(area: FocusArea) {
        focusArea.value = area;
        if (area !== 'input' && area !== 'modal' && area !== 'none') {
            lastActiveView.value = area;
        }
    }

    function syncWorkspaceFocusArea() {
        if (helpDocumentVisible.value) {
            setFocusArea('modal');
            return;
        }

        if (exportPreviewVisible.value) {
            setFocusArea('exportPreview');
            return;
        }

        if (rightVisible.value && focusArea.value === 'sidebarRight') {
            return;
        }

        setFocusArea(activeChunkId.value ? 'chunkView' : 'defaultView');
    }

    function setLeftPanel(panelName: string) {
        if (activeLeftPanel.value === panelName) {
            leftVisible.value = !leftVisible.value;
            if (!leftVisible.value) {
                syncWorkspaceFocusArea();
            }
        } else {
            activeLeftPanel.value = panelName;
            leftVisible.value = true;
        }
    }

    function toggleLeftSidebar() {
        leftVisible.value = !leftVisible.value;
        if (!leftVisible.value) {
            syncWorkspaceFocusArea();
        }
    }

    function toggleRightSidebar() {
        rightVisible.value = !rightVisible.value;
        if (!rightVisible.value && focusArea.value === 'sidebarRight') {
            syncWorkspaceFocusArea();
        }
    }

    const showHidden = ref(false);

    function toggleShowHidden() {
        showHidden.value = !showHidden.value;
    }

    function toggleExportPreview() {
        exportPreviewVisible.value = !exportPreviewVisible.value;
        if (exportPreviewVisible.value) {
            setFocusArea('exportPreview');
        } else {
            syncWorkspaceFocusArea();
        }
    }

    const exportPreviewAlwaysWhite = ref(false);
    function toggleExportPreviewAlwaysWhite() {
        exportPreviewAlwaysWhite.value = !exportPreviewAlwaysWhite.value;
    }

    function openHelpDocument() {
        focusBeforeModal.value = focusArea.value;
        helpDocumentVisible.value = true;
        setFocusArea('modal');
    }

    function closeHelpDocument() {
        helpDocumentVisible.value = false;
        if (focusBeforeModal.value !== 'modal') {
            setFocusArea(focusBeforeModal.value);
        } else {
            syncWorkspaceFocusArea();
        }
    }

    function toggleHelpDocument() {
        if (helpDocumentVisible.value) {
            closeHelpDocument();
            return;
        }

        openHelpDocument();
    }

    return {
        activeLeftPanel,
        leftVisible,
        leftPanelWidth,
        setLeftPanel,
        toggleLeftSidebar,

        rightVisible,
        toggleRightSidebar,

        initTheme,
        isDarkMode,
        toggleDarkMode,
        followSystem,
        setFollowSystem,

        activeChunkId,
        setActiveChunk,
        focusArea,
        lastActiveView,
        setFocusArea,
        syncWorkspaceFocusArea,
        showHidden,
        toggleShowHidden,

        exportPreviewVisible,
        toggleExportPreview,
        exportPreviewAlwaysWhite,
        toggleExportPreviewAlwaysWhite,
        helpDocumentVisible,
        openHelpDocument,
        closeHelpDocument,
        toggleHelpDocument,
    };
}

export const useUiStore = defineStore('ui', uiStore);
