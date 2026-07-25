import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

// 侧边栏面板布局常量
export const PANEL_MIN_WIDTH = 150;
export const PANEL_MAX_WIDTH = 600;
const LEGACY_UI_SETTINGS_STORAGE_KEY = 'freecell-log-studio.ui-settings';

interface StoredUiSettings {
    showTime?: boolean;
    showAccount?: boolean;
}

function readLegacyUiSettings(): StoredUiSettings {
    try {
        const raw = localStorage.getItem(LEGACY_UI_SETTINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed !== 'object' || parsed === null) {
            return {};
        }

        return {
            showTime:
                typeof (parsed as StoredUiSettings).showTime === 'boolean'
                    ? (parsed as StoredUiSettings).showTime
                    : undefined,
            showAccount:
                typeof (parsed as StoredUiSettings).showAccount === 'boolean'
                    ? (parsed as StoredUiSettings).showAccount
                    : undefined,
        };
    } catch {
        return {};
    }
}

function uiStore() {
    const legacyUiSettings = readLegacyUiSettings();
    const leftPanelWidth = useLocalStorage(
        'freecell-log-studio.ui.leftPanelWidth',
        232,
    );
    const rightPanelWidth = useLocalStorage(
        'freecell-log-studio.ui.rightPanelWidth',
        280,
    );
    const showTime = useLocalStorage(
        'freecell-log-studio.ui.showTime',
        legacyUiSettings.showTime ?? true,
    );
    const showAccount = useLocalStorage(
        'freecell-log-studio.ui.showAccount',
        legacyUiSettings.showAccount ?? true,
    );
    // 深色模式
    const isDarkMode = useLocalStorage(
        'freecell-log-studio.ui.isDarkMode',
        detectSystemDark(),
    );
    const followSystem = useLocalStorage(
        'freecell-log-studio.ui.followSystem',
        true,
    );

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
    const showHidden = useLocalStorage(
        'freecell-log-studio.ui.showHidden',
        false,
    );
    function toggleShowHidden() {
        showHidden.value = !showHidden.value;
    }

    const exportPreviewAlwaysWhite = useLocalStorage(
        'freecell-log-studio.ui.exportPreviewAlwaysWhite',
        false,
    );
    function toggleExportPreviewAlwaysWhite() {
        exportPreviewAlwaysWhite.value = !exportPreviewAlwaysWhite.value;
    }

    return {
        leftPanelWidth,
        rightPanelWidth,
        showTime,
        showAccount,
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
