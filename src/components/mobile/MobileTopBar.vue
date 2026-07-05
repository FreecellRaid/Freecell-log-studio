<template>
    <header class="mobile-topbar">
        <button
            class="mobile-topbar-button"
            type="button"
            title="打开全局菜单"
            @click="$emit('menu')"
        >
            <PanelLeftOpen class="ui-icon" />
        </button>

        <div class="mobile-project-summary">
            <h4>{{ projectName || '未命名工程' }}</h4>
        </div>
        <button
            class="mobile-topbar-button"
            type="button"
            title="导入文档/工程"
            @click="$emit('import')"
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

defineProps<{
    projectName: string;
}>();

defineEmits<{
    (e: 'menu'): void;
    (e: 'import'): void;
}>();

const showExportPopover = ref(false);
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

.mobile-topbar-button {
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

.mobile-topbar-button .ui-icon {
    width: 20px;
    height: 20px;
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
