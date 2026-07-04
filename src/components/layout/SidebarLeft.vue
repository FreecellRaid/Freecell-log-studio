<template>
    <div
        class="sidebar-left-container"
        :class="{ 'is-collapsed': !windowStore.leftSidebarVisible }"
    >
        <nav class="activity-bar">
            <div class="nav-top">
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.activeLeftPanelName === 'chunkList' &&
                            windowStore.leftSidebarVisible,
                    }"
                    title="文件列表"
                    @click="handleNavClick('chunkList')"
                >
                    <FolderOpen class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.activeLeftPanelName === 'identity' &&
                            windowStore.leftSidebarVisible,
                    }"
                    title="身份管理"
                    @click="handleNavClick('identity')"
                >
                    <UserRound class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.activeLeftPanelName === 'ruleEditor' &&
                            windowStore.leftSidebarVisible,
                    }"
                    title="染色规则"
                    @click="handleNavClick('ruleEditor')"
                >
                    <Palette class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.activeLeftPanelName === 'search' &&
                            windowStore.leftSidebarVisible,
                    }"
                    title="搜索过滤"
                    @click="handleNavClick('search')"
                >
                    <Search class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.activeLeftPanelName ===
                                'exportFormat' &&
                            windowStore.leftSidebarVisible,
                    }"
                    title="导出模板"
                    @click="handleNavClick('exportFormat')"
                >
                    <TextInitial class="ui-icon" />
                </div>
            </div>
            <div class="nav-bottom">
                <div
                    class="nav-item"
                    title="切换主题"
                    @click="uiStore.toggleDarkMode"
                >
                    <Moon v-if="uiStore.isDarkMode" class="ui-icon" />
                    <SunMedium v-else class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{ active: showSettings }"
                    title="偏好设置"
                    @click.stop="showSettings = !showSettings"
                >
                    <Settings class="ui-icon" />
                </div>
                <div v-if="showSettings" class="settings-popover" @click.stop>
                    <SettingsPopover />
                </div>
            </div>
        </nav>

        <aside
            v-if="windowStore.leftSidebarVisible"
            class="side-panel"
            :style="{ width: uiStore.leftPanelWidth + 'px' }"
        >
            <div class="panel-content">
                <div
                    v-if="windowStore.activeLeftPanelName === 'chunkList'"
                    class="panel-slot"
                >
                    <ChunkListPanel />
                </div>
                <div
                    v-else-if="windowStore.activeLeftPanelName === 'identity'"
                    class="panel-slot"
                >
                    <IdentityPanel />
                </div>
                <div
                    v-else-if="windowStore.activeLeftPanelName === 'ruleEditor'"
                    class="panel-slot"
                >
                    <RuleEditorPanel />
                </div>
                <div
                    v-else-if="windowStore.activeLeftPanelName === 'search'"
                    class="panel-slot"
                >
                    <SearchPanel />
                </div>
                <div
                    v-else-if="
                        windowStore.activeLeftPanelName === 'exportFormat'
                    "
                    class="panel-slot"
                >
                    <ExportFormatPanel />
                </div>
            </div>
        </aside>

        <div
            v-if="windowStore.leftSidebarVisible"
            class="resize-handle resize-handle-x resize-handle-overlay resize-handle-right-edge"
            @mousedown="startResize"
        ></div>
    </div>
</template>

<script setup lang="ts">
import {
    FolderOpen,
    Moon,
    Palette,
    Search,
    Settings,
    SunMedium,
    TextInitial,
    UserRound,
} from '@lucide/vue';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useStyleStore } from '@/stores/styleStore';
import { usePanelResize } from '@/composables/usePanelResize';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import IdentityPanel from '@/components/panels/IdentityPanel.vue';
import RuleEditorPanel from '@/components/panels/RuleEditorPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';
import SettingsPopover from '@/components/popovers/SettingsPopover.vue';

const uiStore = useUiStore();
const windowStore = useWindowStore();
const styleStore = useStyleStore();
const showSettings = ref(false);
const closeSettings = () => {
    showSettings.value = false;
};
const { startResize } = usePanelResize({
    edge: 'right',
    getWidth: () => uiStore.leftPanelWidth,
    setWidth: (width) => {
        uiStore.leftPanelWidth = width;
    },
});

onMounted(() => {
    window.addEventListener('click', closeSettings);
    // 初始化左侧边栏面板注册
    if (windowStore.leftSidebarVisible && windowStore.activeLeftPanelName) {
        windowStore.setLeftPanel(windowStore.activeLeftPanelName);
    }
});
onUnmounted(() => {
    window.removeEventListener('click', closeSettings);
});
watch(
    () => styleStore.viewSettings.colorMode,
    (newMode) => {
        styleStore.rules.forEach((rule) => {
            // 仅处理系统基础规则 (priority 为 0 的规则)
            if (rule.priority === 0) {
                rule.isActive =
                    (newMode === 'playerName' && !!rule.filter.playerName) ||
                    (newMode === 'account' && !!rule.filter.account);
            }
        });
    },
    { immediate: true }, // 立即执行一次以确保初始状态正确
);

function handleNavClick(panelName: typeof windowStore.activeLeftPanelName) {
    if (
        windowStore.leftSidebarVisible &&
        windowStore.activeLeftPanelName === panelName
    ) {
        windowStore.toggleLeftSidebar();
    } else {
        windowStore.setLeftPanel(panelName);
    }
}
</script>

<style scoped>
.sidebar-left-container {
    display: flex;
    height: 100%;
    background-color: var(--bg-sidebar);
    position: relative;
}

.sidebar-left-container.is-collapsed {
    width: 48px;
}

.activity-bar {
    width: 48px;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    flex-shrink: 0;
}

.is-collapsed .activity-bar {
    border-right: none;
}

.nav-item {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--icon-color);
    transition: all 0.2s;
    position: relative;
}

.nav-item:hover {
    color: var(--icon-color-strong);
}

.nav-item.active {
    color: var(--icon-color-strong);
}

/* 选中的左侧边框指示器 */
.nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 0px;
    width: 3px;
    background-color: var(--active-accent);
}

.nav-item :deep(.ui-icon) {
    width: 24px;
    height: 24px;
    margin-top: 8px;
}

/* 内容面板样式 */
.side-panel {
    background-color: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    flex-shrink: 0;
}

.panel-content {
    flex: 1;
    min-height: 0;
}

.panel-slot {
    height: 100%;
    min-height: 0;
}

/* 设置弹出框样式 */
.settings-popover {
    position: absolute;
    left: 49px;
    bottom: -1px;
}
</style>
