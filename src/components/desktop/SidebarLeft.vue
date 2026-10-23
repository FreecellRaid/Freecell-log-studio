<template>
    <div
        class="sidebar-left-container"
        :class="{
            'is-collapsed': !windowStore.isWindowOpen(
                windowStore.selectedLeftPanel,
            ),
        }"
    >
        <nav class="activity-bar">
            <div class="nav-top">
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.selectedLeftPanel === 'chunkList' &&
                            windowStore.isWindowOpen('chunkList'),
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
                            windowStore.selectedLeftPanel === 'coloring' &&
                            windowStore.isWindowOpen('coloring'),
                    }"
                    title="样式"
                    @click="handleNavClick('coloring')"
                >
                    <Palette class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.selectedLeftPanel === 'search' &&
                            windowStore.isWindowOpen('search'),
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
                            windowStore.selectedLeftPanel === 'exportFormat' &&
                            windowStore.isWindowOpen('exportFormat'),
                    }"
                    title="导出模板"
                    @click="handleNavClick('exportFormat')"
                >
                    <TextInitial class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            windowStore.selectedLeftPanel === 'resources' &&
                            windowStore.isWindowOpen('resources'),
                    }"
                    title="资源管理"
                    role="button"
                    tabindex="0"
                    @click="handleNavClick('resources')"
                    @keydown.enter="handleNavClick('resources')"
                    @keydown.space.prevent="handleNavClick('resources')"
                >
                    <Images class="ui-icon" />
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
            v-if="windowStore.isWindowOpen(windowStore.selectedLeftPanel)"
            class="side-panel"
            :style="{ width: uiStore.leftPanelWidth + 'px' }"
        >
            <div class="panel-content">
                <div
                    v-if="windowStore.selectedLeftPanel === 'chunkList'"
                    class="panel-slot"
                >
                    <ChunkListPanel />
                </div>
                <div
                    v-else-if="windowStore.selectedLeftPanel === 'coloring'"
                    class="panel-slot"
                >
                    <ColoringPanel />
                </div>
                <div
                    v-else-if="windowStore.selectedLeftPanel === 'search'"
                    class="panel-slot"
                >
                    <SearchPanel />
                </div>
                <div
                    v-else-if="windowStore.selectedLeftPanel === 'exportFormat'"
                    class="panel-slot"
                >
                    <ExportFormatPanel />
                </div>
                <div
                    v-else-if="windowStore.selectedLeftPanel === 'resources'"
                    class="panel-slot"
                >
                    <ResourcePanel />
                </div>
            </div>
        </aside>

        <div
            v-if="windowStore.isWindowOpen(windowStore.selectedLeftPanel)"
            class="resize-handle resize-handle-x resize-handle-overlay resize-handle-right-edge"
            @mousedown="startResize"
        ></div>
    </div>
</template>

<script setup lang="ts">
import {
    FolderOpen,
    Images,
    Moon,
    Palette,
    Search,
    Settings,
    SunMedium,
    TextInitial,
} from '@lucide/vue';
import { defineAsyncComponent, ref, onMounted, onUnmounted } from 'vue';
import { usePanelResize } from '@/composables/ui/usePanelResize';
import { useUiStore } from '@/stores/ui/uiStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import ColoringPanel from '@/components/panels/ColoringPanel.vue';
import ResourcePanel from '@/components/panels/ResourcePanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';

const SettingsPopover = defineAsyncComponent(
    () => import('@/components/popovers/SettingsPopover.vue'),
);

const uiStore = useUiStore();
const windowStore = useWindowStore();
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
});
onUnmounted(() => {
    window.removeEventListener('click', closeSettings);
});
function handleNavClick(panelName: typeof windowStore.selectedLeftPanel) {
    if (
        windowStore.isWindowOpen(windowStore.selectedLeftPanel) &&
        windowStore.selectedLeftPanel === panelName
    ) {
        windowStore.toggleLeftPanel();
    } else {
        windowStore.openLeftPanel(panelName);
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
    left: 48px;
    bottom: 0px;
    z-index: 10;
}
</style>
