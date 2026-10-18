<template>
    <div
        v-if="mobileUiStore.leftDrawerOpen"
        class="mobile-left-backdrop"
        @click.self="mobileUiStore.closeOverlay"
        @touchstart="closeGesture.onTouchStart"
        @touchend="closeGesture.onTouchEnd"
        @touchcancel="closeGesture.onTouchCancel"
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
                    @click="openLatestStoredProject"
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
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <MessageSquareOff class="ui-icon" />
                    </span>
                    <span>隐藏场外消息</span>
                    <ToggleButton
                        v-model="styleStore.viewSettings.hideOoc"
                        aria-label="隐藏场外消息"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Terminal class="ui-icon" />
                    </span>
                    <span>隐藏指令消息</span>
                    <ToggleButton
                        v-model="styleStore.viewSettings.hideCommand"
                        aria-label="隐藏指令消息"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <MessageSquare class="ui-icon" />
                    </span>
                    <span>导入时删除场外括号</span>
                    <ToggleButton
                        v-model="importSettingsStore.stripOocParentheses"
                        aria-label="导入时删除场外括号"
                        title="删除首尾的（）和()，不删除场外消息"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <FolderOpen class="ui-icon" />
                    </span>
                    <span>远程导入后自动关闭</span>
                    <ToggleButton
                        v-model="importSettingsStore.autoCloseRemoteImport"
                        aria-label="导入后自动关闭弹窗"
                        title="关闭此选项可保留弹窗下载原始文件"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Clock3 class="ui-icon" />
                    </span>
                    <span>显示时间</span>
                    <ToggleButton
                        v-model="uiStore.showTime"
                        aria-label="显示时间"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <AtSign class="ui-icon" />
                    </span>
                    <span>显示账号</span>
                    <ToggleButton
                        v-model="uiStore.showAccount"
                        aria-label="显示账号"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Eye class="ui-icon" />
                    </span>
                    <span>显示被过滤消息</span>
                    <ToggleButton
                        v-model="uiStore.showHidden"
                        aria-label="显示被过滤消息"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Code class="ui-icon" />
                    </span>
                    <span>启用 Markdown</span>
                    <ToggleButton
                        v-model="styleStore.viewSettings.enableMarkdown"
                        aria-label="启用 Markdown"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Palette class="ui-icon" />
                    </span>
                    <span>按角色名染色</span>
                    <ToggleButton
                        v-model="styleStore.viewSettings.colorMode"
                        value="playerName"
                        aria-label="按角色名染色"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <AtSign class="ui-icon" />
                    </span>
                    <span>按账号染色</span>
                    <ToggleButton
                        v-model="styleStore.viewSettings.colorMode"
                        value="account"
                        aria-label="按账号染色"
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <Monitor class="ui-icon" />
                    </span>
                    <span>深色模式跟随系统</span>
                    <ToggleButton
                        :model-value="uiStore.followSystem"
                        aria-label="深色模式跟随系统"
                        @update:model-value="
                            uiStore.setFollowSystem(Boolean($event))
                        "
                    />
                </div>
                <div class="drawer-row">
                    <span class="drawer-row-icon">
                        <FileImage class="ui-icon" />
                    </span>
                    <span>预览始终白色背景</span>
                    <ToggleButton
                        v-model="uiStore.exportPreviewAlwaysWhite"
                        aria-label="预览始终白色背景"
                    />
                </div>
            </div>
        </aside>
    </div>
</template>

<script setup lang="ts">
import ToggleButton from '@/components/common/ToggleButton.vue';
import {
    AtSign,
    BookOpen,
    Clock3,
    Code,
    Eye,
    FileImage,
    FolderOpen,
    MessageSquare,
    MessageSquareOff,
    Monitor,
    Moon,
    Palette,
    Pencil,
    Save,
    SunMedium,
    Terminal,
    Trash2,
} from '@lucide/vue';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useUiStore } from '@/stores/ui/uiStore';
import { useImportSettingsStore } from '@/stores/io/importSettingsStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useWorkspaceActions } from '@/composables/application/useWorkspaceActions';
import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';

const logStore = useLogStore();
const styleStore = useStyleStore();
const uiStore = useUiStore();
const importSettingsStore = useImportSettingsStore();
const windowStore = useWindowStore();
const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();
const workspaceActions = useWorkspaceActions();
const closeGesture = useSwipeGesture({
    direction: 'left',
    onSwipe: mobileUiStore.closeOverlay,
});

function startProjectNameEdit() {
    editorSessionStore.startEditing({ kind: 'projectName' });
    mobileUiStore.openSheet('projectName');
}

function openLatestStoredProject() {
    const latestProject = workspaceActions.getStoredProjects()[0];
    if (!latestProject) return;

    if (workspaceActions.openStoredProject(latestProject.projectId)) {
        mobileUiStore.reset();
    }
}

function clearAll() {
    workspaceActions.clearWorkspaceWithConfirmation({
        focusTarget: 'defaultView',
        afterClear: mobileUiStore.reset,
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

.drawer-row :deep(.toggle-button) {
    margin-left: auto;
}
</style>
