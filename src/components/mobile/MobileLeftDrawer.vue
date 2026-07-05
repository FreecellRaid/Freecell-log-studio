<template>
    <div class="mobile-left-backdrop" @click.self="$emit('close')">
        <aside class="mobile-left-drawer">
            <header class="mobile-drawer-header">
                <div>
                    <h2>{{ logStore.projectName || '未命名工程' }}</h2>
                    <p>{{ logStore.totalMessages }} 条消息</p>
                </div>
                <button
                    class="mobile-icon-button"
                    type="button"
                    title="关闭"
                    @click="$emit('close')"
                >
                    <X class="ui-icon" />
                </button>
            </header>

            <div class="mobile-left-actions">
                <button
                    class="mobile-menu-button"
                    type="button"
                    @click="$emit('editProjectName')"
                >
                    <Pencil class="ui-icon" />
                    <span>编辑项目名</span>
                </button>
                <button
                    class="mobile-menu-button"
                    type="button"
                    @click="$emit('saveProject')"
                >
                    <Save class="ui-icon" />
                    <span>保存到本地</span>
                </button>
                <button
                    class="mobile-menu-button"
                    type="button"
                    @click="$emit('showStoredProjects')"
                >
                    <FolderOpen class="ui-icon" />
                    <span>恢复本地快照</span>
                </button>
                <button
                    class="mobile-menu-button"
                    type="button"
                    @click="windowStore.openHelpDocument"
                >
                    <BookOpen class="ui-icon" />
                    <span>帮助文档</span>
                </button>
                <button
                    class="mobile-menu-button"
                    type="button"
                    @click="uiStore.toggleDarkMode"
                >
                    <Moon v-if="uiStore.isDarkMode" class="ui-icon" />
                    <SunMedium v-else class="ui-icon" />
                    <span>
                        {{ uiStore.isDarkMode ? '浅色模式' : '深色模式' }}
                    </span>
                </button>
                <button
                    class="mobile-menu-button is-warning"
                    type="button"
                    :disabled="!hasWorkspaceState"
                    @click="$emit('clearAll')"
                >
                    <Trash2 class="ui-icon" />
                    <span>清空全部数据</span>
                </button>
            </div>

            <div class="mobile-settings-list">
                <label class="mobile-toggle">
                    <span>显示时间</span>
                    <input v-model="uiStore.showTime" type="checkbox" />
                </label>
                <label class="mobile-toggle">
                    <span>显示账号</span>
                    <input v-model="uiStore.showAccount" type="checkbox" />
                </label>
                <label class="mobile-toggle">
                    <span>显示被过滤消息</span>
                    <input v-model="uiStore.showHidden" type="checkbox" />
                </label>
            </div>
        </aside>
    </div>
</template>

<script setup lang="ts">
import {
    BookOpen,
    FolderOpen,
    Moon,
    Pencil,
    Save,
    SunMedium,
    Trash2,
    X,
} from '@lucide/vue';
import { useLogStore } from '@/stores/logStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';

defineProps<{
    hasWorkspaceState: boolean;
}>();

defineEmits<{
    (e: 'close'): void;
    (e: 'editProjectName'): void;
    (e: 'saveProject'): void;
    (e: 'showStoredProjects'): void;
    (e: 'clearAll'): void;
}>();

const logStore = useLogStore();
const uiStore = useUiStore();
const windowStore = useWindowStore();
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
    padding: 12px;
}

.mobile-menu-button {
    width: 100%;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
}

.mobile-menu-button .ui-icon {
    width: 18px;
    height: 18px;
    color: var(--icon-color);
}

.mobile-menu-button.is-warning {
    color: var(--color-warning);
}

.mobile-menu-button:disabled {
    opacity: 0.5;
}

.mobile-toggle {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-primary);
}

.mobile-toggle input {
    width: 22px;
    height: 22px;
}
</style>
