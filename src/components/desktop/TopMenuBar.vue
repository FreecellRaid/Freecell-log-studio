<template>
    <header class="top-bar">
        <div
            class="project-name project-entry"
            type="button"
            title="打开帮助文档"
            @click="() => editorDialogs.open('help')"
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
        <div class="topbar-links">
            <a
                target="_blank"
                href="https://github.com/FreecellRaid/Freecell-log-studio/issues"
                class="link-item"
            >
                建议反馈
                <ExternalLink class="ui-icon link-icon" />
            </a>
            <a
                target="_blank"
                href="https://github.com/FreecellRaid/Freecell-log-studio/releases"
                class="link-item"
            >
                离线版下载
                <ExternalLink class="ui-icon link-icon" />
            </a>
        </div>
        <div class="global-actions" v-click-outside="closeAllPopovers">
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
                :disabled="
                    logStore.documents.length === 0 ||
                    projectManager.storageState.isSaving
                "
            >
                <Save class="ui-icon" aria-hidden="true" />
            </button>

            <div class="snapshot-container">
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
                        :loading="storedProjectsLoading"
                        :error="storedProjectsError"
                        :warnings="
                            projectManager.storageState.migrationWarnings
                        "
                        @refresh="refreshStoredProjects"
                        @close="closeAllPopovers"
                    />
                </div>
            </div>

            <div class="import-container">
                <button
                    class="icon-interactive"
                    type="button"
                    title="导入文档/工程"
                    aria-haspopup="menu"
                    :aria-expanded="showImportPopover"
                    @click.stop="toggleImportPanel"
                >
                    <Upload class="ui-icon" aria-hidden="true" />
                </button>
                <div
                    v-if="showImportPopover"
                    class="topbar-popover import-popover"
                >
                    <ImportPopover
                        @file="handleSelectFileImport"
                        @clipboard="handleClipboardImport"
                        @link="handleLinkImport"
                    />
                </div>
            </div>
            <input
                :ref="setFileInput"
                type="file"
                accept=".txt,.trpglog,.json,.docx,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                hidden
                @change="handleFileChange"
            />

            <div class="export-container">
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
import { useDialogStore } from '@/stores/ui/dialogStore';

import { ref } from 'vue';
import {
    Download,
    Trash2,
    Save,
    FolderOpen,
    Upload,
    ExternalLink,
} from '@lucide/vue';
import { useLogStore } from '@/stores/project/logStore';
import { useFileImportInput } from '@/composables/application/useImporter';
import { useProjectManager } from '@/composables/application/useProjectManager';
import { useWorkspaceActions } from '@/composables/application/useWorkspaceActions';
import { vClickOutside } from '@/directives/clickOutside';
import type { StoredProjectSummary } from '@/io/storage/projectStorage';
import StoredProjectsPopover from '@/components/popovers/StoredProjectsPopover.vue';
import ExportPopover from '@/components/popovers/ExportPopover.vue';
import { useRemoteImportStore } from '@/stores/io/remoteImportStore';
import ImportPopover from '@/components/popovers/ImportPopover.vue';

const logStore = useLogStore();
const editorDialogs = useDialogStore();
const { setFileInput, triggerImport, handleFileChange, importFromClipboard } =
    useFileImportInput();
const projectManager = useProjectManager();
const workspaceActions = useWorkspaceActions();
const hasWorkspaceState = workspaceActions.hasWorkspaceState;

const showExportPopover = ref(false);
const showStoredProjectsPopover = ref(false);
const showImportPopover = ref(false);
const storedProjects = ref<StoredProjectSummary[]>([]);
const storedProjectsLoading = ref(false);
const storedProjectsError = ref('');
let listRequest = 0;
function closeAllPopovers() {
    showExportPopover.value = false;
    showStoredProjectsPopover.value = false;
    showImportPopover.value = false;
}

function toggleImportPanel() {
    const targetState = !showImportPopover.value;
    closeAllPopovers();
    showImportPopover.value = targetState;
}

function handleLinkImport() {
    closeAllPopovers();
    useRemoteImportStore().open();
}

function handleSelectFileImport() {
    closeAllPopovers();
    triggerImport();
}

async function handleClipboardImport() {
    closeAllPopovers();
    await importFromClipboard();
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
        void refreshStoredProjects();
    }
    showStoredProjectsPopover.value = targetState;
}

async function refreshStoredProjects() {
    const request = ++listRequest;
    storedProjectsLoading.value = true;
    storedProjectsError.value = '';
    try {
        const projects = await projectManager.getStoredProjects();
        if (request === listRequest) storedProjects.value = projects;
    } catch (error) {
        if (request === listRequest)
            storedProjectsError.value =
                error instanceof Error ? error.message : '读取本地工程失败';
    } finally {
        if (request === listRequest) storedProjectsLoading.value = false;
    }
}

async function handleSaveProject() {
    closeAllPopovers();
    await workspaceActions.saveCurrentProjectWithFeedback({
        afterSave: refreshStoredProjects,
    });
}

function handleClearAll() {
    closeAllPopovers();
    workspaceActions.clearWorkspaceWithConfirmation();
}
</script>

<style scoped>
.top-bar :deep(.ui-icon) {
    width: 16px;
    height: 16px;
}

.global-actions {
    margin-left: auto;
}

.global-actions > button,
.snapshot-container > button,
.import-container > button {
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

.ui-icon.link-icon {
    width: 14px;
    height: 14px;
}

.top-bar {
    display: flex;
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
.snapshot-container,
.import-container {
    display: flex;
    align-items: center;
    position: relative;
}

.topbar-popover {
    position: absolute;
    z-index: 100;
}

.stored-projects-popover {
    top: 35px;
    right: -80px;
}

.export-popover {
    top: 30px;
    right: -10px;
}

.import-popover {
    top: 35px;
    right: -10px;
}

.topbar-links {
    display: flex;
    align-items: left;
    gap: 12px;
    margin-left: 16px;
    margin-top: 4px;
}

.link-item {
    font-size: 13px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
}

.link-item:hover {
    color: var(--active-accent);
    transition: color 0.2s;
}
</style>
