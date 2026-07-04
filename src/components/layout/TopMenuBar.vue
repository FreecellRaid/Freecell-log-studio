<template>
    <header class="top-bar">
        <div
            class="project-name project-entry"
            type="button"
            title="打开帮助文档"
            @click="windowStore.openHelpDocument"
        >
            <div class="icon-project">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient
                            id="g1"
                            x1="20.5"
                            y1="16"
                            x2="100"
                            y2="200"
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop stop-color="#ACAAFF" />
                            <stop offset="1" stop-color="#C0E8FF" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M156.06 143.94L112.13 100l43.93-43.94L200 100l-43.94 43.94zM43.94 143.94L0 100l43.94-43.94L87.87 100l-43.93 43.94zM100 200l-43.94-43.94L100 112.13l43.94 43.93L100 200zM100 87.87L56.06 43.94 100 0l43.94 43.94-43.94 43.93z"
                        fill="url(#g1)"
                    />
                </svg>
            </div>
            <div>跑团Log编辑器</div>
        </div>
        <div class="global-actions">
            <button
                class="icon-interactive icon-button-warning"
                type="button"
                title="清空全部数据"
                @click="handleClearAll"
                :disabled="!hasWorkspaceState"
            >
                <Trash2 class="ui-icon" aria-hidden="true" />
            </button>

            <button
                class="icon-interactive"
                type="button"
                title="保存到本地"
                @click="handleSaveProject"
                :disabled="logStore.documents.length === 0"
            >
                <Save class="ui-icon" aria-hidden="true" />
            </button>

            <div class="snapshot-container" v-click-outside="closeAllPopovers">
                <button
                    class="icon-interactive"
                    type="button"
                    title="恢复本地快照"
                    @click.stop="toggleStoredProjects"
                >
                    <FolderOpen class="ui-icon" aria-hidden="true" />
                </button>

                <div
                    v-if="showStoredProjectsPopover"
                    class="topbar-popover stored-projects-popover"
                >
                    <StoredProjectsPopover
                        :projects="storedProjects"
                        @refresh="refreshStoredProjects"
                        @close="closeAllPopovers"
                    />
                </div>
            </div>

            <button
                class="icon-interactive"
                type="button"
                title="导入文档/工程"
                @click="triggerImport"
            >
                <Upload class="ui-icon" aria-hidden="true" />
            </button>
            <input
                ref="fileInput"
                type="file"
                accept=".txt,.json,application/json"
                multiple
                hidden
                @change="handleFileChange"
            />

            <div class="export-container" v-click-outside="closeAllPopovers">
                <button
                    class="icon-interactive"
                    type="button"
                    title="导出记录"
                    @click.stop="toggleExportPanel"
                >
                    <Download class="ui-icon" aria-hidden="true" />
                </button>
                <div
                    v-if="showExportPopover"
                    class="topbar-popover export-popover"
                >
                    <ExportPopover />
                </div>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Download, Trash2, Save, FolderOpen, Upload } from '@lucide/vue';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useWindowStore } from '@/stores/windowStore';
import { useActiveContext } from '@/composables/useActiveContext';
import { useFileImport } from '@/composables/useImporter';
import { useProjectManager } from '@/composables/useProjectManager';
import { vClickOutside } from '@/directives/clickOutside';
import type { ProjectFile } from '@/types/project';
import StoredProjectsPopover from '@/components/popovers/StoredProjectsPopover.vue';
import ExportPopover from '@/components/popovers/ExportPopover.vue';

const fileInput = ref<HTMLInputElement | null>(null);

const logStore = useLogStore();
const styleStore = useStyleStore();
const clipboardStore = useClipboardStore();
const historyStore = useHistoryStore();
const windowStore = useWindowStore();

const activeContext = useActiveContext();
const { importAndApply } = useFileImport();
const projectManager = useProjectManager();

const showExportPopover = ref(false);
const showStoredProjectsPopover = ref(false);
const storedProjects = ref<ProjectFile[]>([]);
function closeAllPopovers() {
    showExportPopover.value = false;
    showStoredProjectsPopover.value = false;
}

function toggleExportPanel() {
    if (logStore.documents.length === 0) return;
    const targetState = !showExportPopover.value;
    closeAllPopovers();
    showExportPopover.value = targetState;
}

function toggleStoredProjects() {
    const targetState = !showStoredProjectsPopover.value;
    closeAllPopovers();
    if (targetState) {
        refreshStoredProjects();
    }
    showStoredProjectsPopover.value = targetState;
}

const hasWorkspaceState = computed(() => {
    return (
        logStore.documents.length > 0 ||
        styleStore.rules.length > 0 ||
        clipboardStore.copiedMessages.length > 0 ||
        activeContext.hasSelection.value ||
        historyStore.undoStack.length > 0 ||
        historyStore.redoStack.length > 0
    );
});

function triggerImport() {
    fileInput.value?.click();
}

async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files?.length) return;

    try {
        await importAndApply(Array.from(files));
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '解析文件时发生错误');
    } finally {
        target.value = '';
    }
}

function refreshStoredProjects() {
    storedProjects.value = projectManager.getStoredProjects();
}

function handleSaveProject() {
    const result = projectManager.saveCurrentProjectToLocal();
    if (!result.success) {
        alert('本地存储空间不足，保存失败。');
        return;
    }
    refreshStoredProjects();
    alert(
        result.removedCount > 0
            ? `工程已保存，并自动清理了 ${result.removedCount} 个旧版本。`
            : '工程已成功保存到本地。',
    );
}

function handleClearAll() {
    if (!hasWorkspaceState.value) return;
    if (!window.confirm('确定要清空所有数据吗？本操作不可撤销。')) return;

    logStore.clearData();
    styleStore.clearRules();
    clipboardStore.clearClipboard();
    activeContext.clearSelection();
    historyStore.clearHistory();
    windowStore.setFocus('default');
}
</script>

<style scoped>
.top-bar :deep(.ui-icon) {
    width: 16px;
    height: 16px;
}

.global-actions > button,
.snapshot-container > button {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
}

.icon-interactive:hover:not(:disabled),
.icon-interactive:focus-visible:not(:disabled) {
    color: var(--icon-color-strong);
}

.icon-button-warning:hover:not(:disabled),
.icon-button-warning:focus-visible:not(:disabled) {
    color: var(--color-warning);
}

.icon-interactive:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
}

.project-name {
    display: flex;
    align-items: center;
    font-size: 16px;
}

.project-entry {
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    cursor: pointer;
}

.project-entry:hover,
.project-entry:focus-visible {
    color: var(--icon-color-strong);
}

.icon-project {
    width: 20px;
    height: 20px;
    margin-top: 3px;
    margin-right: 8px;
}

.global-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.export-container,
.snapshot-container {
    display: flex;
    align-items: center;
    position: relative;
}

.topbar-popover {
    position: absolute;
    z-index: 100;
}

.stored-projects-popover {
    top: 36px;
    right: -80px;
}

.export-popover {
    top: 30px;
    right: -10px;
}
</style>
