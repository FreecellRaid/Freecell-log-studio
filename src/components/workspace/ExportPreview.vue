<template>
    <div
        class="view"
        data-focus-area="exportPreview"
        :class="{ 'preview-always-white': uiStore.exportPreviewAlwaysWhite }"
    >
        <header class="view-header">
            <div class="view-title">
                <Eye class="ui-icon icon-view-title" />
                <h2>导出预览</h2>
                <span class="msg-count" v-if="currentFormat">
                    当前模板: {{ currentFormat.formatName }} ({{ rows.length }}
                    项)
                </span>
            </div>
        </header>

        <div class="message-list-container export-preview-content">
            <div v-if="rows.length === 0" class="view-empty-hint">
                当前没有可导出的内容。
            </div>

            <template v-else>
                <div
                    v-for="(row, index) in rows"
                    :key="index"
                    class="preview-row"
                >
                    <div
                        v-if="
                            row.type === 'documentSeparator' &&
                            currentFormat.docSeparator
                        "
                        class="separator-preview"
                    >
                        <span
                            v-for="(token, tIdx) in docSeparatorTokens"
                            :key="'doc-' + tIdx"
                        >
                            <template v-if="token.type === 'text'">
                                {{ token.value }}
                            </template>
                            <br v-else-if="token.type === 'newline'" />
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
                            currentFormat.chunkSeparator
                        "
                        class="separator-preview"
                    >
                        <span
                            v-for="(token, tIdx) in chunkSeparatorTokens"
                            :key="'chunk-' + tIdx"
                        >
                            <template v-if="token.type === 'text'">
                                {{ token.value }}
                            </template>
                            <br v-else-if="token.type === 'newline'" />
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
                            <br v-else-if="token.type === 'newline'" />
                            <span
                                v-else-if="token.type === 'tab'"
                                class="tab-space"
                            ></span>
                            <span
                                v-else-if="token.type === 'placeholder'"
                                :style="
                                    getStyleForPlaceholder(token.value, row)
                                "
                            >
                                {{
                                    getPlaceholderValue(
                                        token.value,
                                        row,
                                        currentFormat,
                                    )
                                }}
                            </span>
                        </span>

                        <span class="message-separator">
                            <span
                                v-for="(token, tIdx) in messageSeparatorTokens"
                                :key="'sep-' + tIdx"
                            >
                                <template v-if="token.type === 'text'">
                                    {{ token.value }}
                                </template>
                                <br v-else-if="token.type === 'newline'" />
                                <span
                                    v-else-if="token.type === 'tab'"
                                    class="tab-space"
                                ></span>
                            </span>
                        </span>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { Eye } from '@lucide/vue';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useExportStore } from '@/stores/exportStore';
import { useUiStore } from '@/stores/uiStore';
import { flattenLogToRows } from '@/io/export/flattener';
import { parseTemplate, getPlaceholderValue } from '@/io/export/templateParser';
import type { ExportRow } from '@/types/export';

const logStore = useLogStore();
const styleStore = useStyleStore();
const exportStore = useExportStore();
const uiStore = useUiStore();
const currentFormat = computed(() => exportStore.currentFormat);
const rows = computed(() => {
    return flattenLogToRows(
        logStore.documents,
        styleStore.viewSettings,
        styleStore.enabledRules,
    );
});

// 性能优化：将当前格式的模板字符串预解析为 Token 数组
const messageTokens = computed(() =>
    parseTemplate(currentFormat.value.messageTemplate),
);
const messageSeparatorTokens = computed(() =>
    parseTemplate(currentFormat.value.messageSeparator),
);
const docSeparatorTokens = computed(() =>
    parseTemplate(currentFormat.value.docSeparator || ''),
);
const chunkSeparatorTokens = computed(() =>
    parseTemplate(currentFormat.value.chunkSeparator || ''),
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

function syncFocusedFormatId() {
    if (uiStore.focusArea === 'exportPreview') {
        uiStore.setFocusedFormatId(currentFormat.value?.formatId || null);
    }
}

onMounted(() => {
    syncFocusedFormatId();
});

watch(
    () => uiStore.focusArea,
    () => {
        syncFocusedFormatId();
    },
);

watch(
    () => currentFormat.value?.formatId,
    () => {
        syncFocusedFormatId();
    },
);

onUnmounted(() => {
    if (uiStore.focusedFormatId === currentFormat.value?.formatId) {
        uiStore.setFocusedFormatId(null);
    }
});
</script>

<style scoped>
.message-list-container {
    flex: 1;
    overflow-y: auto;
    background-color: var(--bg-workspace);
}

.export-preview-content {
    padding: 20px;
    font-family: monospace;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
}

/* 用于模拟 Tab 缩进的占位符 */
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
