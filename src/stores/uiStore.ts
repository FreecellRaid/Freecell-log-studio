import { defineStore } from 'pinia';
import { ref } from 'vue';

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
    const rightVisible = ref(false);
    const exportPreviewVisible = ref(false);

    function setActiveChunk(id: string | null) {
        activeChunkId.value = id;
    }

    function setLeftPanel(panelName: string) {
        if (activeLeftPanel.value === panelName) {
            leftVisible.value = !leftVisible.value;
        } else {
            activeLeftPanel.value = panelName;
            leftVisible.value = true;
        }
    }

    function toggleLeftSidebar() {
        leftVisible.value = !leftVisible.value;
    }

    function toggleRightSidebar() {
        rightVisible.value = !rightVisible.value;
    }

    const showHidden = ref(false);

    function toggleShowHidden() {
        showHidden.value = !showHidden.value;
    }

    function toggleExportPreview() {
        exportPreviewVisible.value = !exportPreviewVisible.value;
    }
    
    const exportPreviewAlwaysWhite = ref(false);
    function toggleExportPreviewAlwaysWhite() {
        exportPreviewAlwaysWhite.value = !exportPreviewAlwaysWhite.value;
    }

    return {
        activeLeftPanel,
        leftVisible,
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
        showHidden,
        toggleShowHidden,

        exportPreviewVisible,
        toggleExportPreview,
        exportPreviewAlwaysWhite,
        toggleExportPreviewAlwaysWhite,
    };
}

export const useUiStore = defineStore('ui', uiStore);
