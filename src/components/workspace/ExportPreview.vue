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
                    v-if="windowStore.splitMode === 'single'"
                    class="view-action-btn"
                    title="向右分屏"
                    @click.stop="handleSplit"
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>

                <button
                    v-if="windowStore.splitMode === 'double' || canClose"
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
                    ref="scrollerRef"
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
                                row.content,
                                activeFormat.messageTemplate,
                            ]"
                            :data-index="index"
                        >
                            <div class="preview-row">
                                <div
                                    v-if="
                                        row.type === 'documentSeparator' &&
                                        activeFormat.docSeparator
                                    "
                                    class="separator-preview"
                                >
                                    <span
                                        v-for="(
                                            token, tIdx
                                        ) in docSeparatorTokens"
                                        :key="'doc-' + tIdx"
                                    >
                                        <template v-if="token.type === 'text'">
                                            {{ token.value }}
                                        </template>
                                        <br
                                            v-else-if="token.type === 'newline'"
                                        />
                                        <span
                                            v-else-if="token.type === 'tab'"
                                            class="tab-space"
                                        ></span>
                                        <template
                                            v-else-if="
                                                token.type === 'placeholder' &&
                                                token.value === 'name'
                                            "
                                        >
                                            {{ row.content }}
                                        </template>
                                    </span>
                                </div>

                                <div
                                    v-else-if="
                                        row.type === 'chunkSeparator' &&
                                        activeFormat.chunkSeparator
                                    "
                                    class="separator-preview"
                                >
                                    <span
                                        v-for="(
                                            token, tIdx
                                        ) in chunkSeparatorTokens"
                                        :key="'chunk-' + tIdx"
                                    >
                                        <template v-if="token.type === 'text'">
                                            {{ token.value }}
                                        </template>
                                        <br
                                            v-else-if="token.type === 'newline'"
                                        />
                                        <span
                                            v-else-if="token.type === 'tab'"
                                            class="tab-space"
                                        ></span>
                                        <template
                                            v-else-if="
                                                token.type === 'placeholder' &&
                                                token.value === 'name'
                                            "
                                        >
                                            {{ row.content }}
                                        </template>
                                    </span>
                                </div>

                                <div
                                    v-else-if="row.type === 'message'"
                                    class="message-preview"
                                >
                                    <span
                                        v-for="(token, tIdx) in messageTokens"
                                        :key="'msg-' + tIdx"
                                    >
                                        <template v-if="token.type === 'text'">
                                            {{ token.value }}
                                        </template>
                                        <br
                                            v-else-if="token.type === 'newline'"
                                        />
                                        <span
                                            v-else-if="token.type === 'tab'"
                                            class="tab-space"
                                        ></span>
                                        <span
                                            v-else-if="
                                                token.type === 'placeholder'
                                            "
                                            :style="
                                                getStyleForPlaceholder(
                                                    token.value,
                                                    row,
                                                )
                                            "
                                        >
                                            {{
                                                getPlaceholderValue(
                                                    token.value,
                                                    row,
                                                    activeFormat,
                                                )
                                            }}
                                        </span>
                                    </span>

                                    <span class="message-separator">
                                        <span
                                            v-for="(
                                                token, tIdx
                                            ) in messageSeparatorTokens"
                                            :key="'sep-' + tIdx"
                                        >
                                            <template
                                                v-if="token.type === 'text'"
                                            >
                                                {{ token.value }}
                                            </template>
                                            <br
                                                v-else-if="
                                                    token.type === 'newline'
                                                "
                                            />
                                            <span
                                                v-else-if="token.type === 'tab'"
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
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useExportStore } from '@/stores/exportStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import { flattenLogToRows } from '@/io/export/flattener';
import { parseTemplate, getPlaceholderValue } from '@/io/export/templateParser';
import type { ExportRow } from '@/types/export';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

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
        windowStore.splitMode === 'single' &&
        effectiveWindowId.value !== 'defaultView' &&
        windowStore.openWindows.size > 1
    );
});

// 计算行数据，并为每一行添加 rowId 供虚拟滚动 key 使用
const rowsWithId = computed(() => {
    const rawRows = flattenLogToRows(
        logStore.documents,
        styleStore.viewSettings,
        styleStore.activeRules,
    );
    return rawRows.map((row, index) => ({
        ...row,
        rowId: `${row.type}-${index}`,
    }));
});

// 兼容旧变量名
const rows = computed(() => rowsWithId.value);

function handleSplit() {
    windowStore.enterSplitMode('exportPreview', props.originalId);
}

function handleClose() {
    if (windowStore.splitMode === 'double') {
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

const messageTokens = computed(() =>
    parseTemplate(activeFormat.value.messageTemplate),
);
const messageSeparatorTokens = computed(() =>
    parseTemplate(activeFormat.value.messageSeparator),
);
const docSeparatorTokens = computed(() =>
    parseTemplate(activeFormat.value.docSeparator || ''),
);
const chunkSeparatorTokens = computed(() =>
    parseTemplate(activeFormat.value.chunkSeparator || ''),
);

function getStyleForPlaceholder(
    key: string,
    row: ExportRow,
): Record<string, string> {
    const exportStyle =
        key === 'name'
            ? row.nameStyle
            : key === 'content'
              ? row.contentStyle
              : null;

    if (!exportStyle) return {};

    const css: Record<string, string> = {};
    if (exportStyle.color) css.color = exportStyle.color;
    if (exportStyle.bold) css.fontWeight = 'bold';
    if (exportStyle.italic) css.fontStyle = 'italic';

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
