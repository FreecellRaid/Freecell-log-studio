<template>
    <div
        class="view"
        :data-focus-id="props.formatId"
        :class="{
            'preview-always-white': uiStore.exportPreviewAlwaysWhite,
            'is-active': windowStore.activeFocus === props.formatId,
        }"
        @pointerdown="
            uiStore.setFocus({
                type: 'window',
                id: props.formatId,
            })
        "
    >
        <header class="view-header">
            <div class="view-title">
                <Eye class="ui-icon icon-view-title" />
                <h2>导出预览</h2>
                <span class="msg-count" v-if="activeFormat">
                    当前模板: {{ activeFormat.formatName }} ({{ rows.length }}
                    项)
                </span>
            </div>
            <button
                class="close-button"
                @click="windowStore.toggleExportPreview(props.formatId)"
            >
                <X class="ui-icon" />
            </button>
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
                            activeFormat.docSeparator
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
                            activeFormat.chunkSeparator
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
                                        activeFormat,
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
import { computed, onMounted, onUnmounted } from 'vue';
import { Eye, X } from '@lucide/vue';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useExportStore } from '@/stores/exportStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import { flattenLogToRows } from '@/io/export/flattener';
import { parseTemplate, getPlaceholderValue } from '@/io/export/templateParser';
import type { ExportRow } from '@/types/export';

const logStore = useLogStore();
const styleStore = useStyleStore();
const exportStore = useExportStore();
const uiStore = useUiStore();
const windowStore = useWindowStore();
const activeFormat = computed(() => exportStore.activeFormat);
// 接收从 MainWorkspace 传来的 ID
const props = defineProps<{ formatId: string }>();
const windowId = props.formatId;

onMounted(() => {
    windowStore.registerWindow({
        windowId: props.formatId,
        windowName: 'exportPreview',
        windowType: 'view',
    });
});

// 销毁时注销焦点，方便回到上一个ChunkView
onUnmounted(() => {
    windowStore.unregisterWindow(windowId);
});

const rows = computed(() => {
    return flattenLogToRows(
        logStore.documents,
        styleStore.viewSettings,
        styleStore.activeRules,
    );
});

// 性能优化：将当前格式的模板字符串预解析为 Token 数组
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

.close-button {
    border: none;
    background-color: var(--bg-workspace);
    margin-left: auto;
}
</style>
