import { defineStore } from 'pinia';
import { ref } from 'vue';

// 侧边栏面板布局常量
export const PANEL_MIN_WIDTH = 150;
export const PANEL_MAX_WIDTH = 600;

function uiStore() {
    const leftPanelWidth = ref(232);
    // 深色模式
    const isDarkMode = ref(detectSystemDark());
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

    return {
        leftPanelWidth,
        exportPreviewAlwaysWhite,
        isDarkMode,
        followSystem,
        showHidden,
        toggleExportPreviewAlwaysWhite,
        toggleDarkMode,
        initTheme,
        setFollowSystem,
        toggleShowHidden,
    };
}

export const useUiStore = defineStore('ui', uiStore);
