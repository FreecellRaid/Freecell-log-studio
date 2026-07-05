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
    margin-bottom: 10px;
}

.mobile-drawer-header p {
    margin: 3px 0 0;
}

.mobile-left-actions,
.mobile-settings-list {
    padding: 0px 12px;
}
</style>
