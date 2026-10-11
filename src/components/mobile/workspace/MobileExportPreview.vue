<template>
    <section
        class="mobile-export-preview"
        :class="{ 'preview-always-white': uiStore.exportPreviewAlwaysWhite }"
    >
        <header class="mobile-preview-header">
            <h2>{{ activeFormat?.formatName ?? '未知模板' }}预览</h2>
            <button
                class="mobile-icon-button"
                type="button"
                title="关闭预览"
                aria-label="关闭预览"
                @click="windowStore.unregisterWindow(windowId)"
            >
                <X class="ui-icon" />
            </button>
        </header>
        <ExportPreviewContent
            v-if="activeFormat"
            :rows-with-id="rowsWithId"
            :active-format="activeFormat"
            :enable-markdown="enableMarkdown"
        />
        <div v-else class="view-empty-hint">当前预览模板已不存在。</div>
    </section>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue';
import ExportPreviewContent from '@/components/common/workspace/ExportPreviewContent.vue';
import { useExportPreview } from '@/composables/application/useExportPreview';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useUiStore } from '@/stores/ui/uiStore';

const props = defineProps<{ windowId: string; originalId: string }>();
const windowStore = useWindowStore();
const uiStore = useUiStore();
const { activeFormat, rowsWithId, enableMarkdown } = useExportPreview(
    () => props.originalId,
);
</script>

<style scoped>
.mobile-export-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--bg-workspace);
}
.mobile-preview-header {
    min-height: 50px;
    padding: 0px 12px 0px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.mobile-preview-header h2 {
    margin: 0;
    font-size: 16px;
    overflow-wrap: anywhere;
}
.mobile-icon-button {
    margin-left: auto;
}

.preview-always-white {
    --bg-workspace: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #1a202c;
    --text-muted: #718096;
    --icon-color: #a0aec0;
}
</style>
