<template>
    <div
        v-if="mobileStore.leftDrawerOpen"
        class="mobile-left-backdrop"
        @click.self="mobileStore.closeLeftDrawer"
    >
        <aside class="mobile-left-drawer">
            <header class="mobile-drawer-header">
                <h2>{{ logStore.projectName || '未命名工程' }}</h2>
                <p>{{ logStore.totalMessages }} 条消息</p>
            </header>

            <div class="mobile-left-actions">
                <button
                    class="drawer-row"
                    type="button"
                    @click="startProjectNameEdit"
                >
                    <span class="drawer-row-icon">
                        <Pencil class="ui-icon" />
                    </span>
                    <span>编辑项目名</span>
                </button>
                <button
                    class="drawer-row"
                    type="button"
                    @click="workspaceActions.saveCurrentProjectWithFeedback()"
                >
                    <span class="drawer-row-icon">
                        <Save class="ui-icon" />
                    </span>
                    <span>保存到本地</span>
                </button>
                <button
                    class="drawer-row"
                    type="button"
                    @click="showStoredProjects"
                >
                    <span class="drawer-row-icon">
                        <FolderOpen class="ui-icon" />
                    </span>
                    <span>恢复本地快照</span>
                </button>
                <button
                    class="drawer-row"
                    type="button"
                    @click="windowStore.openHelpDocument"
                >
                    <span class="drawer-row-icon">
                        <BookOpen class="ui-icon" />
                    </span>
                    <span>帮助文档</span>
                </button>
                <button
                    class="drawer-row"
                    type="button"
                    @click="uiStore.toggleDarkMode"
                >
                    <span class="drawer-row-icon">
                        <Moon v-if="uiStore.isDarkMode" class="ui-icon" />
                        <SunMedium v-else class="ui-icon" />
                    </span>
                    <span>
                        {{ uiStore.isDarkMode ? '浅色模式' : '深色模式' }}
                    </span>
                </button>
                <button
                    class="drawer-row is-warning"
                    type="button"
                    :disabled="!workspaceActions.hasWorkspaceState.value"
                    @click="clearAll"
                >
                    <span class="drawer-row-icon">
                        <Trash2 class="ui-icon" />
                    </span>
                    <span>清空数据</span>
                </button>
            </div>

            <div class="mobile-settings-list">
                <label class="drawer-row">
                    <span class="drawer-row-icon">
                        <Clock3 class="ui-icon" />
                    </span>
                    <span>显示时间</span>
                    <input v-model="uiStore.showTime" type="checkbox" />
                </label>
                <label class="drawer-row">
                    <span class="drawer-row-icon">
                        <AtSign class="ui-icon" />
                    </span>
                    <span>显示账号</span>
                    <input v-model="uiStore.showAccount" type="checkbox" />
                </label>
                <label class="drawer-row">
                    <span class="drawer-row-icon">
                        <Eye class="ui-icon" />
                    </span>
                    <span>显示被过滤消息</span>
                    <input v-model="uiStore.showHidden" type="checkbox" />
                </label>
            </div>
        </aside>
    </div>
</template>

<script setup lang="ts">
import {
    AtSign,
    BookOpen,
    Clock3,
    Eye,
    FolderOpen,
    Moon,
    Pencil,
    Save,
    SunMedium,
    Trash2,
} from '@lucide/vue';
import { useLogStore } from '@/stores/logStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import { useProjectManager } from '@/composables/useProjectManager';
import { useWorkspaceActions } from '@/composables/useWorkspaceActions';

const logStore = useLogStore();
const uiStore = useUiStore();
const windowStore = useWindowStore();
const mobileStore = useMobileEditorStore();
const projectManager = useProjectManager();
const workspaceActions = useWorkspaceActions();

function startProjectNameEdit() {
    mobileStore.startProjectNameEdit(logStore.projectName);
}

function showStoredProjects() {
    mobileStore.openStoredProjects(projectManager.getStoredProjects());
}

function clearAll() {
    workspaceActions.clearWorkspaceWithConfirmation({
        focusTarget: 'defaultView',
        afterClear: mobileStore.resetAfterClear,
    });
}
</script>

<style scoped>
.mobile-left-backdrop {
    position: fixed;
    inset: 0;
    background: var(--box-shadow);
    z-index: 90;
    display: flex;
    align-items: stretch;
    justify-content: flex-start;
}

.mobile-left-drawer {
    width: min(82vw, 340px);
    height: 100%;
    overflow-y: auto;
    background: var(--bg-workspace);
    box-shadow: 8px 0 28px var(--box-shadow);
    padding-top: env(safe-area-inset-top);
}

.mobile-drawer-header {
    min-height: 50px;
    padding: 0 8px 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 10px;
}

.mobile-drawer-header h2 {
    margin: 0;
    font-size: 16px;
}

.mobile-drawer-header p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
}

.mobile-icon-button {
    width: 42px;
    height: 42px;
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mobile-icon-button .ui-icon {
    width: 20px;
    height: 20px;
}

.mobile-left-actions,
.mobile-settings-list {
    padding: 0px 12px;
}

.drawer-row {
    width: 100%;
    min-height: 46px;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 4px;
    text-align: left;
    box-sizing: border-box;
    font-size: 16px;
}

.drawer-row:last-child {
    border-bottom: 0;
}

.drawer-row:hover,
.drawer-row:focus-visible {
    background: var(--hover-bg);
}

.drawer-row > span:not(.drawer-row-icon) {
    min-width: 0;
    flex: 1;
}

.drawer-row-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--icon-color);
}

.drawer-row-icon .ui-icon {
    width: 18px;
    height: 18px;
}

.drawer-row.is-warning {
    color: var(--color-warning);
}

.drawer-row.is-warning .drawer-row-icon {
    color: var(--color-warning);
}

.drawer-row:disabled {
    opacity: 0.5;
}

.drawer-row input {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
}
</style>
