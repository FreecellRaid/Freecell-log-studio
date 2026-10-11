<template>
    <div
        class="view"
        :data-focus-id="effectiveWindowId"
        :class="{
            'preview-always-white': uiStore.exportPreviewAlwaysWhite,
            'is-active': isActive,
        }"
        @pointerdown="windowStore.setFocus(props.windowId)"
    >
        <header class="view-header">
            <div class="view-title">
                <Eye class="ui-icon icon-view-title" />
                <h2 class="text-view-title">
                    {{ activeFormat?.formatName ?? '未知模板' }}预览
                </h2>
                <span class="msg-count">({{ rowsWithId.length }} 行)</span>
            </div>
            <div class="view-actions">
                <button
                    v-if="!windowStore.hasSplitView"
                    class="view-action-btn"
                    title="向右分屏"
                    @click.stop="handleSplit"
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>

                <button
                    class="view-action-btn"
                    title="关闭"
                    @click.stop="handleClose"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>

        <ExportPreviewContent
            v-if="activeFormat"
            :rows-with-id="rowsWithId"
            :active-format="activeFormat"
            :enable-markdown="enableMarkdown"
        />
        <div v-else class="view-empty-hint">当前预览模板已不存在。</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Eye, X, SquareSplitHorizontal } from '@lucide/vue';
import ExportPreviewContent from '@/components/common/workspace/ExportPreviewContent.vue';
import { useExportPreview } from '@/composables/application/useExportPreview';
import { useUiStore } from '@/stores/ui/uiStore';
import { useWindowStore } from '@/stores/ui/windowStore';

const uiStore = useUiStore();
const windowStore = useWindowStore();
const props = defineProps<{
    windowId: string;
    originalId: string;
}>();

const effectiveWindowId = computed(() => props.windowId);
const isActive = computed(() => windowStore.activeFocus === props.windowId);
const { activeFormat, rowsWithId, enableMarkdown } = useExportPreview(
    () => props.originalId,
);

function handleSplit() {
    windowStore.openSplitView('exportPreview', props.originalId);
}

function handleClose() {
    windowStore.unregisterWindow(effectiveWindowId.value);
}
</script>

<style scoped>
.text-view-title {
    color: var(--text-preview);
}

.preview-always-white {
    /* 局部覆写 CSS 变量为浅色模式的值 */
    --bg-workspace: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #1a202c;
    --text-muted: #718096;
    --icon-color: #a0aec0;
}
</style>
