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
                class="icon icon-button-warning"
                type="button"
                title="清空全部数据"
                @click="handleClearAll"
                :disabled="!hasWorkspaceState"
            >
                <Trash2 class="ui-icon" aria-hidden="true" />
            </button>

            <button
                class="icon"
                type="button"
                title="保存到本地"
                @click="handleSaveProject"
                :disabled="logStore.documents.length === 0"
            >
                <Save class="ui-icon" aria-hidden="true" />
            </button>

            <div class="snapshot-container" v-click-outside="closeAllPanels">
                <button
                    class="icon"
                    type="button"
                    title="恢复本地快照"
                    @click.stop="toggleStoredProjects"
                >
                    <FolderOpen class="ui-icon" aria-hidden="true" />
                </button>

                <div v-if="showStoredProjects" class="stored-projects-panel">
                    <div class="stored-projects-toolbar">
                        <span>本地工程</span>
                        <button
                            class="action-button icon-interactive"
                            type="button"
                            @click="refreshStoredProjects"
                        >
                            刷新
                        </button>
                    </div>
                    <div
                        v-if="storedProjects.length === 0"
                        class="stored-projects-empty"
                    >
                        当前没有已保存的本地工程
                    </div>
                    <div
                        v-for="project in storedProjects"
                        :key="project.projectId"
                        class="stored-project-item"
                    >
                        <div class="stored-project-main">
                            <div class="stored-project-name">
                                {{ project.projectName || '未命名工程' }}
                            </div>
                            <div class="stored-project-meta">
                                {{ formatStoredProjectTime(project.time) }} ·
                                {{ project.documents.length }} 文档
                            </div>
                        </div>
                        <button
                            class="stored-project-open icon-interactive"
                            type="button"
                            @click="handleOpenStoredProject(project.projectId)"
                        >
                            打开
                        </button>
                    </div>
                </div>
            </div>

            <button
                class="icon"
                type="button"
                title="导入文档/工程"
                @click="triggerImport"
            >
                <Download class="ui-icon" aria-hidden="true" />
            </button>
            <input
                ref="fileInput"
                type="file"
                accept=".txt,.json,application/json"
                multiple
                hidden
                @change="handleFileChange"
            />

            <div class="export-container" v-click-outside="closeAllPanels">
                <button
                    class="icon"
                    type="button"
                    title="导出记录"
                    @click.stop="toggleExportPanel"
                >
                    <Upload class="ui-icon" aria-hidden="true" />
                </button>
                <div v-if="showExportPanel" class="export-panel">
                    <div class="export-item" @click="handleExportText">
                        导出为 TEXT
                    </div>
                    <div class="export-item" @click="handleExportHtml">
                        导出为 HTML
                    </div>
                    <div class="export-item" @click="handleExportDoc">
                        导出为 DOC
                    </div>
                    <div class="export-item" @click="handleExportDocx">
                        导出为 Docx
                    </div>
                    <div class="export-item" @click="handleExportProject">
                        导出为工程文件
                    </div>
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
import { useFilter } from '@/composables/useFilter';
import { useFileImport } from '@/composables/useImporter';
import { useProjectManager } from '@/composables/useProjectManager';
import { useExport } from '@/composables/useExporter';
import { formatDate } from '@/utils/date';
import type { ProjectFile } from '@/types/project';

const fileInput = ref<HTMLInputElement | null>(null);

const logStore = useLogStore();
const styleStore = useStyleStore();
const clipboardStore = useClipboardStore();
const historyStore = useHistoryStore();
const windowStore = useWindowStore();

const filterTool = useFilter();
const { importAndApply } = useFileImport();
const { exportAsText, exportAsHtml, exportAsDoc, exportAsDocx } = useExport();
const projectManager = useProjectManager();

const showExportPanel = ref(false);
const showStoredProjects = ref(false);
const storedProjects = ref<ProjectFile[]>([]);
function closeAllPanels() {
    showExportPanel.value = false;
    showStoredProjects.value = false;
}

function toggleExportPanel() {
    if (logStore.documents.length === 0) return;
    const targetState = !showExportPanel.value;
    closeAllPanels();
    showExportPanel.value = targetState;
}

function toggleStoredProjects() {
    const targetState = !showStoredProjects.value;
    closeAllPanels();
    if (targetState) {
        refreshStoredProjects();
    }
    showStoredProjects.value = targetState;
}

const hasWorkspaceState = computed(() => {
    return (
        logStore.documents.length > 0 ||
        styleStore.rules.length > 0 ||
        clipboardStore.copiedMessages.length > 0 ||
        filterTool.hasSelection.value ||
        historyStore.undoStack.length > 0 ||
        historyStore.redoStack.length > 0 ||
        !windowStore.currentActiveView.windowId ||
        windowStore.currentActiveView.windowId === 'defaultView'
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

async function handleExportText() {
    try {
        exportAsText();
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '导出TXT时发生错误');
    } finally {
        showExportPanel.value = false;
    }
}
async function handleExportHtml() {
    try {
        await exportAsHtml();
    } catch (error) {
        console.error(error);
        alert('导出 HTML 时发生错误');
    } finally {
        showExportPanel.value = false;
    }
}

async function handleExportDoc() {
    try {
        await exportAsDoc();
    } catch (error) {
        console.error(error);
        alert('导出 Doc 时发生错误');
    } finally {
        showExportPanel.value = false;
    }
}

async function handleExportDocx() {
    try {
        await exportAsDocx();
    } catch (error) {
        console.error(error);
        alert('导出 Docx 时发生错误');
    } finally {
        showExportPanel.value = false;
    }
}

function handleExportProject() {
    try {
        projectManager.exportCurrentProject();
    } catch (error) {
        console.error(error);
        alert(
            error instanceof Error ? error.message : '导出工程文件时发生错误',
        );
    } finally {
        showExportPanel.value = false;
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

function handleOpenStoredProject(projectId: string) {
    try {
        if (projectManager.openStoredProject(projectId)) {
            refreshStoredProjects();
            closeAllPanels();
        }
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '打开本地工程失败');
    }
}

function formatStoredProjectTime(time: string) {
    return formatDate(new Date(time));
}

function handleClearAll() {
    if (!hasWorkspaceState.value) return;
    if (!window.confirm('确定要清空所有数据吗？本操作不可撤销。')) return;

    logStore.clearData();
    styleStore.clearRules();
    clipboardStore.clearClipboard();
    filterTool.clearSelection();
    historyStore.clearHistory();
    windowStore.setFocus('default');
}

/** 点击元素外部触发回调 (用于关闭下拉菜单) */
const vClickOutside = {
    mounted(el: any, binding: any) {
        el.clickOutsideEvent = (event: Event) => {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el: any) {
        document.removeEventListener('click', el.clickOutsideEvent);
    },
};
</script>

<style scoped>
.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
}

.project-name {
    font-size: 16px;
    display: flex;
    align-items: center;
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

.export-select {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
}

.export-select:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0;
    background: transparent;
    color: var(--icon-color);
    cursor: pointer;
    transition: color 0.15s ease;
}

.icon:hover:not(:disabled),
.icon:focus-visible:not(:disabled) {
    color: var(--icon-color-strong);
}

.icon :deep(.ui-icon) {
    width: 16px;
    height: 16px;
}

.icon-button-warning:hover:not(:disabled),
.icon-button-warning:focus-visible:not(:disabled) {
    color: var(--color-warning);
}

.icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.stored-projects-panel {
    position: absolute;
    top: 100%;
    right: -70px;
    width: 280px;
    margin-top: 8px;
    padding: 10px 12px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-light);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    max-height: 400px;
    overflow-y: auto;
    color: var(--text-primary);
}

.export-panel {
    position: absolute;
    top: 100%;
    right: 0px;
    width: 160px;
    margin-top: 8px;
    padding: 6px 0;
    background: var(--bg-topbar);
    border: 1px solid var(--border-light);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
}

.export-item {
    padding: 8px 16px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
}

.export-item:hover {
    background: var(--bg-secondary);
    color: var(--icon-color-strong);
}

.stored-projects-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--text-muted);
}

.stored-projects-empty {
    padding: 10px 0;
    font-size: 12px;
    color: var(--text-muted);
}

.stored-project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid var(--border-light);
}

.stored-project-main {
    min-width: 0;
}

.stored-project-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stored-project-meta {
    margin-top: 4px;
    font-size: 11px;
    color: var(--text-muted);
}

.stored-project-open {
    flex-shrink: 0;
    padding: 5px 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.action-button {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}
</style>
