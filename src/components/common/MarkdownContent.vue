<template>
    <span
        v-if="enabled && inlineContent !== null"
        class="markdown-content"
        v-html="inlineContent"
    ></span>
    <div
        v-else-if="enabled"
        class="markdown-content"
        v-html="renderedContent"
    ></div>
    <span v-else class="plain-content">{{ content }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdownToHtml } from '@/editor/markdown';

const props = defineProps<{
    content: string;
    enabled: boolean;
}>();

const renderedContent = computed(() =>
    renderMarkdownToHtml(props.content).trimEnd(),
);
const inlineContent = computed(() => {
    const match = renderedContent.value.match(/^<p>([\s\S]*)<\/p>$/);
    return match?.[1] ?? null;
});
</script>

<style scoped>
.plain-content {
    white-space: pre-wrap;
}

.markdown-content {
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: normal;
}

.markdown-content :deep(> :first-child) {
    margin-top: 0;
}

.markdown-content :deep(> :last-child) {
    margin-bottom: 0;
}

.markdown-content :deep(p),
.markdown-content :deep(ul),
.markdown-content :deep(ol),
.markdown-content :deep(blockquote),
.markdown-content :deep(pre),
.markdown-content :deep(table) {
    margin: 0.55em 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
    margin: 0.75em 0 0.4em;
    line-height: 1.25;
}

.markdown-content :deep(h1) {
    font-size: 1.55em;
}

.markdown-content :deep(h2) {
    font-size: 1.35em;
}

.markdown-content :deep(h3) {
    font-size: 1.18em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    padding-left: 1.75em;
}

.markdown-content :deep(blockquote) {
    padding-left: 0.85em;
    border-left: 3px solid var(--border-color);
    color: var(--text-muted);
}

.markdown-content :deep(code) {
    padding: 0.1em 0.3em;
    border-radius: 3px;
    background: var(--hover-bg);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.9em;
}

.markdown-content :deep(pre) {
    max-width: 100%;
    padding: 0.75em;
    overflow-x: auto;
    border-radius: 4px;
    background: var(--hover-bg);
}

.markdown-content :deep(pre code) {
    padding: 0;
    background: transparent;
    white-space: pre;
}

.markdown-content :deep(table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
    padding: 0.35em 0.6em;
    border: 1px solid var(--border-color);
    text-align: left;
    white-space: nowrap;
}

.markdown-content :deep(a) {
    color: var(--active-accent);
}
</style>
