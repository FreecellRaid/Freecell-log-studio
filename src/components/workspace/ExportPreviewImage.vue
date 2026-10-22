<template>
    <img
        v-if="source && !failed"
        class="export-image"
        :src="source"
        :alt="image.imageName || '图片'"
        :width="image.resource?.width"
        :height="image.resource?.height"
        decoding="async"
        draggable="false"
        @error="
            failed = true;
            emit('resize');
        "
        @load="emit('resize')"
    />
    <span v-else class="export-image-placeholder">{{ placeholder }}</span>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RenderedExportSegment } from '@/io/export/exportRender';
import { DEFAULT_IMAGE_PLACEHOLDER } from '@/types/export';
import { imageUrlCache } from '@/io/storage/imageUrlCache';
const props = defineProps<{
    image: Extract<RenderedExportSegment, { type: 'image' }>;
}>();
const emit = defineEmits<{ resize: [] }>();
const source = ref('');
const failed = ref(false);
const placeholder = DEFAULT_IMAGE_PLACEHOLDER;
watch(
    () => props.image,
    (image, _old, onCleanup) => {
        failed.value = false;
        const resource = image.resource;
        const lease = resource?.blob
            ? imageUrlCache.acquire(
                  `${image.resourceId}:${resource.updatedAt ?? 0}:export-original`,
                  resource.blob,
              )
            : undefined;
        source.value = lease?.url ?? resource?.sourceUrl ?? '';
        onCleanup(() => lease?.release());
    },
    { immediate: true },
);
</script>
<style scoped>
.export-image {
    display: inline-block;
    vertical-align: top;
    max-width: 100%;
    height: auto;
    object-fit: contain;
}
.export-image-placeholder {
    overflow-wrap: anywhere;
}
</style>
