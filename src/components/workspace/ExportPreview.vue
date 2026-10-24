<template>
    <div
        class="view"
        :class="[
            {
                'preview-always-white': uiStore.exportPreviewAlwaysWhite,
                'is-active': isActive,
            },
        ]"
        :data-focus-id="paneId"
        v-command-scope="{ area: 'preview', paneId, formatId: originalId }"
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
                    v-if="!isMobile && !editorWorkspace.isSplit"
                    class="view-action-btn"
                    title="向右分屏"
                    @click.stop="handleSplit"
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>

                <button
                    class="view-action-btn"
                    type="button"
                    title="关闭预览"
                    aria-label="关闭预览"
                    @click.stop="navigation.closePane(paneId)"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>

        <div
            v-if="activeFormat"
            class="message-list-container export-preview-content"
        >
            <p
                v-if="reading || readError"
                class="preview-resource-status"
                role="status"
            >
                {{ readError || '正在读取图片资源…' }}
            </p>
            <div v-if="rowsWithId.length === 0" class="view-empty-hint">
                当前没有可导出的内容。
            </div>

            <template v-else>
                <DynamicScroller
                    :items="rowsWithId"
                    :min-item-size="24"
                    key-field="rowId"
                    class="scroller"
                >
                    <template #default="{ item: row, index, active }">
                        <DynamicScrollerItem
                            :item="row"
                            :active="active"
                            :size-dependencies="[
                                row.plainText,
                                row.trailingPlainText,
                                row.segments,
                                imageRevisions[row.rowId] || 0,
                                activeFormat.imageTemplate,
                                activeFormat.messageTemplate,
                                activeFormat.messageSeparator,
                                activeFormat.docSeparator,
                                activeFormat.chunkSeparator,
                            ]"
                            :data-index="index"
                        >
                            <div
                                class="preview-row"
                                :class="{
                                    'separator-preview':
                                        row.type === 'documentSeparator' ||
                                        row.type === 'chunkSeparator',
                                }"
                            >
                                <ExportPreviewSegments
                                    :segments="row.segments"
                                    :enable-markdown="enableMarkdown"
                                    @resize="notifyImageResize(row.rowId)"
                                />
                                <ExportPreviewSegments
                                    :segments="row.trailingSegments"
                                    :enable-markdown="enableMarkdown"
                                    @resize="notifyImageResize(row.rowId)"
                                />
                            </div>
                        </DynamicScrollerItem>
                    </template>
                </DynamicScroller>
            </template>
        </div>
        <div v-else class="view-empty-hint">当前预览模板已不存在。</div>
    </div>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';

import { vCommandScope } from '@/directives/commandScope';
import { computed, reactive, watch, toValue, type MaybeRefOrGetter } from 'vue';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode';
import { Eye, X, SquareSplitHorizontal } from '@lucide/vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import ExportPreviewSegments from './ExportPreviewSegments.vue';
import { useExportResources } from '@/composables/resources/useExportResources';
import { renderExportDocument } from '@/io/export/exportRender';
import { flattenLogToRows } from '@/io/export/flattener';
import { useExportStore } from '@/stores/io/exportStore';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useUiStore } from '@/stores/ui/uiStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';

const uiStore = useUiStore();
const navigation = useEditorNavigation();
const editorWorkspace = useWorkspaceStore();
const props = defineProps<{
    paneId: string;
    originalId: string;
}>();
const { isMobile } = useResponsiveMode();

const isActive = computed(() => navigation.isCommandTarget(props.paneId));
const { activeFormat, rowsWithId, enableMarkdown, reading, readError } =
    useExportPreview(() => props.originalId);

function handleSplit() {
    navigation.splitPane({ kind: 'preview', formatId: props.originalId });
}

const imageRevisions = reactive<Record<string, number>>({});
function notifyImageResize(rowId: string) {
    imageRevisions[rowId] = (imageRevisions[rowId] || 0) + 1;
}
watch(
    () => props.originalId,
    () => {
        for (const key of Object.keys(imageRevisions))
            delete imageRevisions[key];
    },
);

function useExportPreview(formatId: MaybeRefOrGetter<string>) {
    const exportStore = useExportStore();
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    // 预览始终绑定实例的模板，不回退到其他活动模板。
    const activeFormat = computed(() =>
        exportStore.formatById(toValue(formatId)),
    );
    const rows = computed(() =>
        activeFormat.value
            ? flattenLogToRows(
                  logStore.documents,
                  styleStore.viewSettings,
                  styleStore.activeRules,
              )
            : [],
    );
    const { context, reading, readError } = useExportResources(rows);
    const rowsWithId = computed(() =>
        activeFormat.value
            ? renderExportDocument(
                  rows.value,
                  activeFormat.value,
                  context.value,
              ).blocks.map((block, index) => ({
                  ...block,
                  rowId: `${block.type}-${index}`,
              }))
            : [],
    );
    const enableMarkdown = computed(
        () => styleStore.viewSettings.enableMarkdown,
    );
    return { activeFormat, rowsWithId, enableMarkdown, reading, readError };
}
</script>

<style scoped>
.view-actions {
    margin-left: auto;
    flex-shrink: 0;
}

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
.message-list-container {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--bg-workspace);
}

.scroller {
    flex: 1;
    height: 100%;
}

.export-preview-content {
    /* 移除 padding，改到 row 内部
       否则虚拟滚动计算偏移时会有偏差 */
    font-family: monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
}

.preview-row {
    padding: 0 20px;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    overflow-wrap: anywhere;
}
.preview-resource-status {
    padding: 0 20px;
    color: var(--text-muted);
    font-size: 12px;
}

.tab-space {
    display: inline-block;
    width: 2em;
}

.separator-preview {
    color: var(--text-muted);
}

.message-preview {
    word-break: break-word;
}
</style>
