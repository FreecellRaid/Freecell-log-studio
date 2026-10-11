<template>
    <div class="message-list-container export-preview-content">
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
                                        <span :style="getSegmentStyle(segment)">
                                            {{ segment.value }}
                                        </span>
                                    </template>
                                    <br
                                        v-else-if="segment.type === 'newline'"
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
                                        <span :style="getSegmentStyle(segment)">
                                            {{ segment.value }}
                                        </span>
                                    </template>
                                    <br
                                        v-else-if="segment.type === 'newline'"
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
                                            v-else-if="segment.type === 'tab'"
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
</template>

<script setup lang="ts">
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import MarkdownContent from '@/components/common/MarkdownContent.vue';
import type { ExportFormat } from '@/types/export';
import type {
    RenderedExportBlock,
    RenderedExportSegment,
} from '@/io/export/exportRender';

defineProps<{
    rowsWithId: (RenderedExportBlock & { rowId: string })[];
    activeFormat: ExportFormat;
    enableMarkdown: boolean;
}>();

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
