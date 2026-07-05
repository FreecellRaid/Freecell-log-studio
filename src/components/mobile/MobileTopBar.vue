<template>
    <header class="mobile-topbar">
        <input
            :ref="setFileInput"
            type="file"
            accept=".txt,.json,application/json"
            multiple
            hidden
            @change="handleFileChange"
        />

        <button
            class="mobile-topbar-button"
            type="button"
            title="打开全局菜单"
            @click="mobileStore.openLeftDrawer"
        >
            <PanelLeftOpen class="ui-icon" />
        </button>

        <div class="mobile-project-summary">
            <h4>{{ logStore.projectName || '未命名工程' }}</h4>
            <p>{{ logStore.totalMessages }} 条消息</p>
        </div>
        <button
            class="mobile-topbar-button"
            type="button"
            title="导入文档/工程"
            @click="triggerImport"
        >
            <Upload class="ui-icon" />
        </button>
        <div class="mobile-export-container">
            <button
                class="mobile-topbar-button"
                type="button"
                title="导出记录"
                @click.stop="showExportPopover = !showExportPopover"
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
import { ref } from 'vue';
import { Download, PanelLeftOpen, Upload } from '@lucide/vue';
import ExportPopover from '@/components/popovers/ExportPopover.vue';
import { useFileImportInput } from '@/composables/useImporter';
import { useLogStore } from '@/stores/logStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';

const showExportPopover = ref(false);
const logStore = useLogStore();
const mobileStore = useMobileEditorStore();
const { setFileInput, triggerImport, handleFileChange } = useFileImportInput();
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

.mobile-export-container {
    position: relative;
    flex-shrink: 0;
}

.mobile-export-popover {
    position: absolute;
    top: calc(100% + 4px);
    right: -10px;
    z-index: 120;
    background: var(--bg-topbar);
}
</style>
