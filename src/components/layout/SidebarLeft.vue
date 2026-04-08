<template>
    <div
        class="sidebar-left-container"
        :class="{ 'is-collapsed': !uiStore.leftVisible }"
    >
        <nav class="activity-bar">
            <div class="nav-top">
                <div
                    class="nav-item"
                    :class="{
                        active:
                            uiStore.activeLeftPanel === 'chunks' &&
                            uiStore.leftVisible,
                    }"
                    title="文件列表"
                    @click="uiStore.setLeftPanel('chunks')"
                >
                    <FolderOpen class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            uiStore.activeLeftPanel === 'characters' &&
                            uiStore.leftVisible,
                    }"
                    title="角色列表"
                    @click="uiStore.setLeftPanel('characters')"
                >
                    <UserRound class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            uiStore.activeLeftPanel === 'rules' &&
                            uiStore.leftVisible,
                    }"
                    title="染色规则"
                    @click="uiStore.setLeftPanel('rules')"
                >
                    <Palette class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            uiStore.activeLeftPanel === 'search' &&
                            uiStore.leftVisible,
                    }"
                    title="搜索过滤"
                    @click="uiStore.setLeftPanel('search')"
                >
                    <Search class="ui-icon" />
                </div>
                <div
                    class="nav-item"
                    :class="{
                        active:
                            uiStore.activeLeftPanel === 'exportFormats' &&
                            uiStore.leftVisible,
                    }"
                    title="导出模板"
                    @click="uiStore.setLeftPanel('exportFormats')"
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
                    <div class="popover-header">偏好设置</div>

                    <div class="settings-section">
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                :checked="uiStore.followSystem"
                                @change="
                                    uiStore.setFollowSystem(
                                        ($event.target as any).checked,
                                    )
                                "
                            />
                            <span>深色模式跟随系统</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                v-model="uiStore.exportPreviewAlwaysWhite"
                            />
                            <span>预览始终白色背景</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                v-model="styleStore.viewSettings.showTime"
                            />
                            <span>显示消息时间</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                v-model="styleStore.viewSettings.showAccount"
                            />
                            <span>显示帐号</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                v-model="styleStore.viewSettings.hideOoc"
                            />
                            <span>隐藏 OOC 消息</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="checkbox"
                                v-model="styleStore.viewSettings.hideCommand"
                            />
                            <span>隐藏指令消息</span>
                        </label>
                        <label
                            class="setting-item"
                            title="开启后，被隐藏的消息将以 0.5 透明度显示而非完全消失"
                        >
                            <input
                                type="checkbox"
                                v-model="uiStore.showHidden"
                            />
                            <span>显示已隐藏消息</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="radio"
                                value="playerName"
                                v-model="styleStore.viewSettings.colorMode"
                            />
                            <span>按角色名染色</span>
                        </label>
                        <label class="setting-item">
                            <input
                                type="radio"
                                value="account"
                                v-model="styleStore.viewSettings.colorMode"
                            />
                            <span>按账号染色</span>
                        </label>
                    </div>
                </div>
            </div>
        </nav>

        <aside v-if="uiStore.leftVisible" class="side-panel">
            <div class="panel-content">
                <div
                    v-if="uiStore.activeLeftPanel === 'chunks'"
                    class="panel-slot"
                >
                    <ChunkListPanel />
                </div>
                <div
                    v-else-if="uiStore.activeLeftPanel === 'characters'"
                    class="panel-slot"
                >
                    <IdentityPanel />
                </div>
                <div
                    v-else-if="uiStore.activeLeftPanel === 'rules'"
                    class="panel-slot"
                >
                    <RuleEditorPanel />
                </div>
                <div
                    v-else-if="uiStore.activeLeftPanel === 'search'"
                    class="panel-slot"
                >
                    <SearchPanel />
                </div>
                <div
                    v-else-if="uiStore.activeLeftPanel === 'exportFormats'"
                    class="panel-slot"
                >
                    <ExportFormatPanel />
                </div>
            </div>
        </aside>
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
import { useUiStore } from '@/stores/uiStore';
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import IdentityPanel from '@/components/panels/IdentityPanel.vue';
import RuleEditorPanel from '@/components/panels/RuleEditorPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';

const uiStore = useUiStore();
const styleStore = useStyleStore();
const showSettings = ref(false);
const closeSettings = () => {
    showSettings.value = false;
};
onMounted(() => {
    window.addEventListener('click', closeSettings);
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
                // 如果当前是角色名模式，则只有过滤条件为角色名的规则才激活，反之亦然
                rule.isActive =
                    (newMode === 'playerName' && !!rule.filter.playerName) ||
                    (newMode === 'account' && !!rule.filter.account);
            }
        });
    },
    { immediate: true }, // 立即执行一次以确保初始状态正确
);
</script>

<style scoped>
.sidebar-left-container {
    display: flex;
    height: 100%;
    width: 280px;
    transition: width 0.2s ease;
    background-color: var(--bg-sidebar);
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
    width: 232px;
    background-color: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
}

.panel-content {
    flex: 1;
    min-height: 0;
}

.panel-slot {
    height: 100%;
    min-height: 0;
}

.placeholder-text {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 20px;
}

/* 设置弹出框样式 */
.nav-item {
    position: relative;
}

.settings-popover {
    position: absolute;
    left: 48px;
    bottom: 16px;
    width: 207px;
    background-color: var(--bg-sidebar);
    border: 1px solid var(--border-color);
    padding: 12px;
    z-index: 100;
    cursor: default;
    color: var(--text-primary);
}

.popover-header {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
}

.settings-section {
    margin-bottom: 12px;
}

.section-title {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0 0 8px 4px;
    text-transform: uppercase;
}

.setting-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
}

.setting-item:hover {
    color: var(--active-accent);
}

.setting-item input[type='checkbox'] {
    cursor: pointer;
}
</style>
