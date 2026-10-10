<template>
    <header class="mobile-topbar">
        <input
            :ref="setFileInput"
            type="file"
            accept=".txt,.trpglog,.json,.docx,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            hidden
            @change="handleFileChange"
        />

        <button
            class="mobile-topbar-button"
            type="button"
            title="打开全局菜单"
            @click="mobileUiStore.openLeftDrawer"
        >
            <PanelLeftOpen class="ui-icon" />
        </button>

        <div class="mobile-project-summary">
            <h4>{{ logStore.projectName || '未命名工程' }}</h4>
            <p>{{ logStore.totalMessages }} 条消息</p>
        </div>
        <div
            class="mobile-import-container"
            v-click-outside="closeImportPopover"
        >
            <button
                class="mobile-topbar-button"
                type="button"
                title="导入文档/工程"
                aria-haspopup="menu"
                :aria-expanded="showImportPopover"
                @click.stop="toggleImportPanel"
            >
                <Upload class="ui-icon" />
            </button>
            <div v-if="showImportPopover" class="mobile-import-popover">
                <ImportPopover
                    @file="handleSelectFileImport"
                    @clipboard="handleClipboardImport"
                    @link="handleLinkImport"
                />
            </div>
        </div>
        <div
            class="mobile-export-container"
            v-click-outside="closeExportPopover"
        >
            <button
                class="mobile-topbar-button"
                type="button"
                title="导出记录"
                @click.stop="toggleExportPanel"
            >
                <Download class="ui-icon" />
            </button>
            <div v-if="showExportPopover" class="mobile-export-popover">
                <ExportPopover />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { Download, PanelLeftOpen, Upload } from '@lucide/vue';
import ImportPopover from '@/components/popovers/ImportPopover.vue';
import { vClickOutside } from '@/directives/clickOutside';
import { useFileImportInput } from '@/composables/application/useImporter';
import { useRemoteImportStore } from '@/stores/ui/remoteImportStore';
import { useLogStore } from '@/stores/project/logStore';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';

const ExportPopover = defineAsyncComponent(
    () => import('@/components/popovers/ExportPopover.vue'),
);

const remoteImport = useRemoteImportStore();
const showImportPopover = ref(false);
const showExportPopover = ref(false);
const logStore = useLogStore();
const mobileUiStore = useMobileUiStore();
const { setFileInput, triggerImport, handleFileChange, importFromClipboard } =
    useFileImportInput();

function closeImportPopover() {
    showImportPopover.value = false;
}

function closeExportPopover() {
    showExportPopover.value = false;
}

function toggleImportPanel() {
    closeExportPopover();
    showImportPopover.value = !showImportPopover.value;
}

function toggleExportPanel() {
    closeImportPopover();
    showExportPopover.value = !showExportPopover.value;
}

function handleSelectFileImport() {
    closeImportPopover();
    triggerImport();
}

async function handleClipboardImport() {
    closeImportPopover();
    await importFromClipboard();
}

function handleLinkImport() {
    closeImportPopover();
    remoteImport.open();
}
</script>

<style scoped>
.mobile-topbar {
    height: calc(48px + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 10px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-topbar);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.mobile-project-summary {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.mobile-project-summary h4,
.mobile-project-summary p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobile-project-summary h4 {
    font-size: 14px;
    line-height: 1.25;
}

.mobile-project-summary p {
    font-size: 11px;
    line-height: 1.2;
    color: var(--text-secondary);
}

.mobile-export-container,
.mobile-import-container {
    position: relative;
    flex-shrink: 0;
}

.mobile-export-popover,
.mobile-import-popover {
    position: absolute;
    top: calc(100% + 4px);
    right: -10px;
    z-index: 120;
    background: var(--bg-topbar);
}
</style>
