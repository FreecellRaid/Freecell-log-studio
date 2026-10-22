<template>
    <template v-for="(segment, index) in segments" :key="index">
        <ExportPreviewImage
            v-if="segment.type === 'image'"
            :image="segment"
            @resize="emit('resize')"
        />
        <MarkdownContent
            v-else-if="segment.type === 'content'"
            :content="segment.value"
            :enabled="enableMarkdown"
            :style="segmentStyle(segment.style)"
        />
        <span
            v-else-if="segment.type === 'text'"
            :style="segmentStyle(segment.style)"
        >
            {{ segment.value }}
        </span>
        <br v-else-if="segment.type === 'newline'" />
        <span v-else-if="segment.type === 'tab'" class="tab-space"></span>
    </template>
</template>
<script setup lang="ts">
import MarkdownContent from '@/components/common/MarkdownContent.vue';
import ExportPreviewImage from './ExportPreviewImage.vue';
import type { RenderedExportSegment } from '@/io/export/exportRender';
import type { ExportStyle } from '@/types/export';
defineProps<{ segments: RenderedExportSegment[]; enableMarkdown: boolean }>();
const emit = defineEmits<{ resize: [] }>();
function segmentStyle(style?: ExportStyle): Record<string, string> {
    if (!style) return {};
    return {
        ...(style.color ? { color: style.color } : {}),
        ...(style.bold ? { fontWeight: 'bold' } : {}),
        ...(style.italic ? { fontStyle: 'italic' } : {}),
    };
}
</script>
<style scoped>
.tab-space {
    display: inline-block;
    width: 2em;
}
</style>
