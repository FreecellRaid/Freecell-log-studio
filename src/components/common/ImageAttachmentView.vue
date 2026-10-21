<template>
    <div ref="container" class="image-attachment-view" :class="{ compact }">
        <div class="image-preview">
            <img
                v-if="previewSource && !imageError"
                :src="previewSource"
                :alt="compact ? '' : attachment?.name || '图片'"
                decoding="async"
                draggable="false"
                @load="imageError = false"
                @error="imageError = true"
            />
            <div
                v-else
                class="preview-placeholder"
                role="img"
                aria-label="图片占位符"
            >
                <ImageOff class="bg-icon" aria-hidden="true" />
            </div>
        </div>
        <div v-if="!compact" class="resource-details">
            <div class="resource-heading">
                <strong class="resource-title">资源状态</strong>
                <span
                    class="resource-status"
                    :class="{ warning: warning }"
                    role="status"
                    aria-live="polite"
                >
                    <LoaderCircle
                        v-if="pending || uploading || reading"
                        class="ui-icon spinning"
                        aria-hidden="true"
                    />
                    {{ statusLabel }}
                </span>
                <a
                    v-if="sourceUrl"
                    :href="sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerpolicy="no-referrer"
                    class="original-link"
                    title="在新标签页打开原始图片链接"
                >
                    打开原图
                    <ExternalLink class="ui-icon" aria-hidden="true" />
                </a>
            </div>
            <p class="resource-description" :class="{ warning }">
                {{ description }}
            </p>
            <p v-if="imageError && !readError" class="preview-error">
                {{ imageResourceText.description.previewError }}
            </p>
            <div v-if="record && !record.blob" class="resource-buttons">
                <button
                    v-if="sourceUrl && !pending"
                    type="button"
                    class="text-button is-primary"
                    :disabled="uploading"
                    @click="tasks.enqueue(record.resourceId, true)"
                >
                    <Download class="ui-icon" aria-hidden="true" />
                    {{ state.downloadLabel }}
                </button>
                <button
                    v-if="pending && !uploading"
                    type="button"
                    class="text-button"
                    @click="tasks.cancel(record.resourceId)"
                >
                    <Square class="ui-icon" aria-hidden="true" />
                    {{ imageResourceText.actions.stop }}
                </button>
                <button
                    type="button"
                    class="text-button"
                    :disabled="uploading"
                    :title="imageResourceText.actions.uploadTitle"
                    @click="copyInput?.click()"
                >
                    <Upload class="ui-icon" aria-hidden="true" />
                    {{
                        uploading
                            ? imageResourceText.status.uploading
                            : imageResourceText.actions.upload
                    }}
                </button>
                <input
                    ref="copyInput"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    :aria-label="imageResourceText.actions.upload"
                    hidden
                    @change="uploadCopy"
                />
            </div>
            <p
                v-if="uploadError"
                class="warning resource-description"
                role="alert"
            >
                {{ uploadError }}
            </p>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import {
    Download,
    ExternalLink,
    ImageOff,
    LoaderCircle,
    Square,
    Upload,
} from '@lucide/vue';
import type { ImageAttachment } from '@/types/resource';
import { useImageResource } from '@/composables/resources/useImageResource';
import { imageResourceText } from '@/data/imageResourceText';
import { resolveImageResourceState } from '@/editor/imageResourceState';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';

const props = defineProps<{
    attachment?: ImageAttachment;
    compact?: boolean;
    previewSrc?: string;
}>();
const tasks = useResourceTasksStore();
const container = ref<HTMLElement | null>(null);
const copyInput = ref<HTMLInputElement>();
const visible = ref(false);
const imageError = ref(false);
const uploadError = ref('');
const uploading = ref(false);
let revision = 0;
let observer: IntersectionObserver | undefined;
const shouldObserve = computed(() => !props.compact || visible.value);
const { record, reading, source, sourceUrl, readError } = useImageResource(
    () => props.attachment?.resourceId,
    shouldObserve,
);
const task = computed(() =>
    props.attachment ? tasks.states[props.attachment.resourceId] : undefined,
);
const previewSource = computed(() => props.previewSrc || source.value);
const state = computed(() =>
    resolveImageResourceState({
        resource: record.value
            ? {
                  sourceUrl: record.value.sourceUrl,
                  hasLocalCopy: !!record.value.blob,
              }
            : undefined,
        task: task.value,
        reading: reading.value,
        readError: readError.value,
        uploading: uploading.value,
    }),
);
const pending = computed(() => state.value.pending);
const warning = computed(() => !!props.attachment && state.value.warning);
const statusLabel = computed(() =>
    props.attachment
        ? state.value.label
        : props.previewSrc
          ? imageResourceText.status.draft
          : imageResourceText.status.empty,
);
const description = computed(() =>
    props.attachment
        ? state.value.description
        : props.previewSrc
          ? imageResourceText.description.draft
          : imageResourceText.description.empty,
);
watch([() => props.previewSrc, source], () => {
    imageError.value = false;
});
// 切换目标时使旧上传失效，资源更新不会中断当前上传。
watch(
    [() => props.attachment?.resourceId, shouldObserve],
    () => {
        revision++;
        imageError.value = false;
        uploadError.value = '';
        uploading.value = false;
    },
    { flush: 'sync' },
);
async function uploadCopy(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || uploading.value) return;
    const ticket = revision;
    const id = props.attachment?.resourceId;
    if (!id) {
        uploading.value = false;
        return;
    }
    uploading.value = true;
    uploadError.value = '';
    try {
        await tasks.saveLocalCopy(id, file);
    } catch (error) {
        if (ticket === revision)
            uploadError.value =
                error instanceof Error
                    ? error.message
                    : imageResourceText.errors.upload;
    } finally {
        if (ticket === revision) uploading.value = false;
        input.value = '';
    }
}
onMounted(() => {
    if (typeof IntersectionObserver === 'undefined') {
        visible.value = true;
        return;
    }
    observer = new IntersectionObserver(
        ([entry]) => {
            visible.value = entry?.isIntersecting ?? false;
        },
        { rootMargin: '240px' },
    );
    if (container.value) observer.observe(container.value);
});
onUnmounted(() => observer?.disconnect());
</script>
<style scoped>
.image-attachment-view {
    width: 100%;
    min-width: 0;
    font-size: 13px;
    line-height: 1.6;
}
.image-preview {
    width: 100%;
    aspect-ratio: 1.82;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-sidebar);
    color: var(--text-muted);
    overflow: hidden;
}
img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.preview-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}
.resource-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 8px;
}
.resource-heading {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 6px 12px;
}
.resource-status,
.original-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.resource-title {
    font-size: inherit;
    font-weight: 600;
    color: var(--text-primary);
}
.resource-status {
    font-size: inherit;
    font-weight: 400;
    color: var(--text-primary);
}
.original-link {
    flex-shrink: 0;
    color: var(--active-accent);
    font-size: inherit;
    text-decoration: none;
}
.original-link:hover {
    text-decoration: underline;
}
p {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    color: var(--text-muted);
}
.resource-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.resource-buttons .text-button {
    font: inherit;
    gap: 6px;
    min-height: 30px;
    padding: 5px 10px;
}
.original-link:focus-visible {
    outline: 2px solid var(--active-accent);
    outline-offset: 2px;
}
.ui-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}
.warning,
.preview-error {
    color: var(--color-warning);
}
.spinning {
    animation: preview-spin 1s linear infinite;
}
@keyframes preview-spin {
    to {
        transform: rotate(360deg);
    }
}
@media (prefers-reduced-motion: reduce) {
    .spinning {
        animation: none;
    }
}
.compact {
    position: relative;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
}
.compact .image-preview {
    aspect-ratio: auto;
    height: 100%;
}
</style>
