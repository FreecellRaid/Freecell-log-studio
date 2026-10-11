<template>
    <div
        :class="[
            isMobile ? 'mobile-export-preview' : 'view',
            {
                'preview-always-white': uiStore.exportPreviewAlwaysWhite,
                'is-active': isActive,
            },
        ]"
        :data-focus-id="effectiveWindowId"
        @pointerdown="handleFocus"
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
                    v-if="!isMobile && !windowStore.hasSplitView"
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
                    @click.stop="handleClose"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>

        <div
            v-if="activeFormat"
            class="message-list-container export-preview-content"
        >
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
                                            v-if="
                                                segment.type === 'text' ||
                                                segment.type === 'content'
                                            "
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
                                    <template
                                        v-for="(segment, tIdx) in row.segments"
                                        :key="'msg-' + tIdx"
                                    >
                                        <MarkdownContent
                                            v-if="segment.type === 'content'"
                                            :content="segment.value"
                                            :enabled="enableMarkdown"
                                            :style="getSegmentStyle(segment)"
                                        />
                                        <template
                                            v-else-if="segment.type === 'text'"
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
                                    </template>

                                    <span class="message-separator">
                                        <span
                                            v-for="(
                                                segment, tIdx
                                            ) in row.trailingSegments"
                                            :key="'sep-' + tIdx"
                                        >
                                            <template
                                                v-if="
                                                    segment.type === 'text' ||
                                                    segment.type === 'content'
                                                "
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
        <div v-else class="view-empty-hint">当前预览模板已不存在。</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode';
import { Eye, X, SquareSplitHorizontal } from '@lucide/vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import MarkdownContent from '@/components/common/MarkdownContent.vue';
import type { RenderedExportSegment } from '@/io/export/exportRender';
import { useExportPreview } from '@/composables/application/useExportPreview';
import { useUiStore } from '@/stores/ui/uiStore';
import { useWindowStore } from '@/stores/ui/windowStore';

const uiStore = useUiStore();
const windowStore = useWindowStore();
const props = defineProps<{
    windowId: string;
    originalId: string;
}>();
const { isMobile } = useResponsiveMode();

const effectiveWindowId = computed(() => props.windowId);
const isActive = computed(() => windowStore.activeFocus === props.windowId);
const { activeFormat, rowsWithId, enableMarkdown } = useExportPreview(
    () => props.originalId,
);

function handleFocus() {
    // 移动端的可见视图是平台投影，点击时不改变桌面 pane 的选择。
    if (!isMobile.value) windowStore.setFocus(props.windowId);
}

function handleSplit() {
    windowStore.openSplitView('exportPreview', props.originalId);
}

function handleClose() {
    windowStore.unregisterWindow(effectiveWindowId.value);
}
function getSegmentStyle(
    segment: RenderedExportSegment,
): Record<string, string> {
    if (
        (segment.type !== 'text' && segment.type !== 'content') ||
        !segment.style
    )
        return {};

    const css: Record<string, string> = {};
    if (segment.style.color) css.color = segment.style.color;
    if (segment.style.bold) css.fontWeight = 'bold';
    if (segment.style.italic) css.fontStyle = 'italic';

    return css;
}
</script>

<style scoped>
.mobile-export-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--bg-workspace);
}

.mobile-preview-header .view-title {
    min-width: 0;
}
.mobile-preview-header .view-actions {
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
