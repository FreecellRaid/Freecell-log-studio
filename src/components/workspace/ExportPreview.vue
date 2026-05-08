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
                <h2 class="text-view-title">导出预览</h2>
                <span class="msg-count" v-if="activeFormat">
                    当前模板: {{ activeFormat.formatName }} ({{ rows.length }}
                    项)
                </span>
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
                    v-if="windowStore.hasSplitView || canClose"
                    class="view-action-btn"
                    title="关闭"
                    @click.stop="handleClose"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>

        <div class="message-list-container export-preview-content">
            <div v-if="rows.length === 0" class="view-empty-hint">
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
                                activeFormat.messageTemplate,
                                activeFormat.messageSeparator,
                                activeFormat.docSeparator,
                                activeFormat.chunkSeparator,
                            ]"
                            :data-index="index"
                        >
                            <div class="preview-row">
                                <div
                                    v-if="row.type !== 'message'"
                                    class="separator-preview"
                                >
                                    <span
                                        v-for="(segment, tIdx) in row.segments"
                                        :key="'block-' + tIdx"
                                    >
                                        <template
                                            v-if="segment.type === 'text'"
                                        >
                                            <span
                                                :style="
                                                    getSegmentStyle(segment)
                                                "
                                            >
                                                {{ segment.value }}
                                            </span>
                                        </template>
                                        <br
                                            v-else-if="
                                                segment.type === 'newline'
                                            "
                                        />
                                        <span
                                            v-else-if="segment.type === 'tab'"
                                            class="tab-space"
                                        ></span>
                                    </span>
                                </div>

                                <div v-else class="message-preview">
                                    <span
                                        v-for="(segment, tIdx) in row.segments"
                                        :key="'msg-' + tIdx"
                                    >
                                        <template
                                            v-if="segment.type === 'text'"
                                        >
                                            <span
                                                :style="
                                                    getSegmentStyle(segment)
                                                "
                                            >
                                                {{ segment.value }}
                                            </span>
                                        </template>
                                        <br
                                            v-else-if="
                                                segment.type === 'newline'
                                            "
                                        />
                                        <span
                                            v-else-if="segment.type === 'tab'"
                                            class="tab-space"
                                        ></span>
                                    </span>

                                    <span class="message-separator">
                                        <span
                                            v-for="(
                                                segment, tIdx
                                            ) in row.trailingSegments"
                                            :key="'sep-' + tIdx"
                                        >
                                            <template
                                                v-if="segment.type === 'text'"
                                            >
                                                <span
                                                    :style="
                                                        getSegmentStyle(segment)
                                                    "
                                                >
                                                    {{ segment.value }}
                                                </span>
                                            </template>
                                            <br
                                                v-else-if="
                                                    segment.type === 'newline'
                                                "
                                            />
                                            <span
                                                v-else-if="
                                                    segment.type === 'tab'
                                                "
                                                class="tab-space"
                                            ></span>
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </DynamicScrollerItem>
                    </template>
                </DynamicScroller>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Eye, X, SquareSplitHorizontal } from '@lucide/vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import {
    renderExportDocument,
    type RenderedExportSegment,
} from '@/io/export/exportRender';
import { flattenLogToRows } from '@/io/export/flattener';
import { useExportStore } from '@/stores/exportStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';

const logStore = useLogStore();
const styleStore = useStyleStore();
const exportStore = useExportStore();
const uiStore = useUiStore();
const windowStore = useWindowStore();
const props = defineProps<{
    windowId: string;
    originalId: string;
}>();

const effectiveWindowId = computed(() => props.windowId);
const isActive = computed(() => windowStore.activeFocus === props.windowId);
const activeFormat = computed(
    () => exportStore.formatById(props.originalId) || exportStore.activeFormat,
);

const canClose = computed(() => {
    return (
        !windowStore.hasSplitView &&
        effectiveWindowId.value !== 'defaultView' &&
        windowStore.openWindows.size > 1
    );
});

const rowsWithId = computed(() => {
    const rawRows = flattenLogToRows(
        logStore.documents,
        styleStore.viewSettings,
        styleStore.activeRules,
    );

    return renderExportDocument(rawRows, activeFormat.value).blocks.map(
        (block, index) => ({
            ...block,
            rowId: `${block.type}-${index}`,
        }),
    );
});

// 兼容旧变量名
const rows = computed(() => rowsWithId.value);

function handleSplit() {
    windowStore.openSplitView('exportPreview', props.originalId);
}

function handleClose() {
    if (windowStore.hasSplitView) {
        windowStore.closePane(effectiveWindowId.value);
    } else {
        windowStore.unregisterWindow(effectiveWindowId.value);

        const otherView = Array.from(windowStore.openWindows.values()).find(
            (win) =>
                win.windowType === 'view' &&
                win.windowId !== effectiveWindowId.value,
        );
        if (otherView) {
            windowStore.setFocus(otherView.windowId);
        } else {
            windowStore.setFocus('defaultView');
        }
    }
}

function getSegmentStyle(
    segment: RenderedExportSegment,
): Record<string, string> {
    if (segment.type !== 'text' || !segment.style) return {};

    const css: Record<string, string> = {};
    if (segment.style.color) css.color = segment.style.color;
    if (segment.style.bold) css.fontWeight = 'bold';
    if (segment.style.italic) css.fontStyle = 'italic';

    return css;
}
</script>

<style scoped>
.message-list-container {
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
    padding: 0;
    font-family: monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
}

.preview-row {
    padding: 0 20px;
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

.preview-always-white {
    /* 局部覆写 CSS 变量为浅色模式的值 */
    --bg-workspace: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #1a202c;
    --text-muted: #718096;
    --icon-color: #a0aec0;
}
</style>
