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
                预览暂时无法显示，可打开原图查看或上传本地副本。
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
                    {{
                        task?.status === 'error'
                            ? '重试下载'
                            : task?.status === 'cancelled'
                              ? '继续下载'
                              : '下载远程图片'
                    }}
                </button>
                <button
                    v-if="pending && !uploading"
                    type="button"
                    class="text-button"
                    @click="tasks.cancel(record.resourceId)"
                >
                    <Square class="ui-icon" aria-hidden="true" />
                    停止下载
                </button>
                <button
                    type="button"
                    class="text-button"
                    :disabled="uploading"
                    title="补全所有引用此资源的图片，并保留原始链接"
                    @click="copyInput?.click()"
                >
                    <Upload class="ui-icon" aria-hidden="true" />
                    {{ uploading ? '正在保存…' : '上传本地副本' }}
                </button>
                <input
                    ref="copyInput"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    aria-label="上传本地副本"
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
import { computed, ref, shallowRef, onMounted, onUnmounted, watch } from 'vue';
import {
    Download,
    ExternalLink,
    ImageOff,
    LoaderCircle,
    Square,
    Upload,
} from '@lucide/vue';
import type { ImageAttachment, ImageResourceRecord } from '@/types/resource';
import {
    resourceRepository,
    normalizeImageUrl,
} from '@/io/storage/resourceStorage';
import { imageUrlCache } from '@/io/storage/imageUrlCache';
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
const record = shallowRef<ImageResourceRecord>();
const reading = ref(true);
const source = ref('');
const readError = ref('');
const imageError = ref(false);
const uploadError = ref('');
const uploading = ref(false);
let revision = 0;
let observer: IntersectionObserver | undefined;
const task = computed(() =>
    props.attachment ? tasks.states[props.attachment.resourceId] : undefined,
);
const previewSource = computed(() => props.previewSrc || source.value);
watch(
    () => props.previewSrc,
    () => {
        imageError.value = false;
    },
);
const pending = computed(
    () => task.value?.status === 'queued' || task.value?.status === 'loading',
);
const sourceUrl = computed(() => {
    try {
        return record.value?.sourceUrl
            ? normalizeImageUrl(record.value.sourceUrl)
            : '';
    } catch {
        return '';
    }
});
const warning = computed(
    () =>
        !!readError.value ||
        (!reading.value && !!props.attachment && !record.value) ||
        (!record.value?.blob && task.value?.status === 'error'),
);
const statusLabel = computed(() => {
    if (!props.attachment) return props.previewSrc ? '待保存' : '未选择图片';
    if (reading.value) return '读取中';
    if (readError.value) return '读取失败';
    if (!record.value) return '资源缺失';
    if (uploading.value) return '正在保存副本';
    if (record.value.blob) return '已保存本地副本';
    if (task.value?.status === 'queued') return '等待下载';
    if (task.value?.status === 'loading') return '正在下载';
    if (task.value?.status === 'error') return '副本未保存';
    if (task.value?.status === 'cancelled') return '下载已停止';
    return sourceUrl.value ? '仅链接' : '待补全';
});
const description = computed(() => {
    if (!props.attachment)
        return props.previewSrc
            ? '保存后可管理图片副本，链接资源不会自动下载。'
            : '选择本地文件或输入图片链接，上方将显示预览。';
    if (reading.value) return '正在读取资源信息…';
    if (readError.value) return readError.value;
    if (!record.value) return '资源记录已缺失，可在下方替换当前图片。';
    if (uploading.value) return '正在验证并保存本地图片，请稍候。';
    if (record.value.blob) return '可离线预览，并随工程文件一起备份。';
    if (task.value?.status === 'queued')
        return '图片已加入下载队列，可继续编辑其他内容。';
    if (task.value?.status === 'loading')
        return '正在保存图片副本，原始链接会继续保留。';
    if (task.value?.status === 'error')
        return `${task.value.error || '下载失败。'} 可打开原图自行保存，再上传本地副本。`;
    if (task.value?.status === 'cancelled')
        return '原始链接仍然保留，可继续下载或上传本地副本。';
    return sourceUrl.value
        ? '链接图片可直接预览；内嵌到 DOCX 需要先保存本地副本。'
        : '没有可下载的链接，可上传本地副本补全图片。';
});
// 缩略图按可见性订阅，编辑视图持续订阅；预览和操作共用同一份资源记录。
const shouldObserve = computed(() => !props.compact || visible.value);
watch(
    [() => props.attachment?.resourceId, shouldObserve],
    ([id, show], _previous, onCleanup) => {
        revision++;
        record.value = undefined;
        source.value = '';
        readError.value = '';
        imageError.value = false;
        uploadError.value = '';
        uploading.value = false;
        reading.value = true;
        if (!id) {
            reading.value = false;
            return;
        }
        if (!show) return;
        let lease: ReturnType<typeof imageUrlCache.acquire> | undefined;
        const subscription = resourceRepository.observe(id).subscribe({
            next(value) {
                record.value = value;
                reading.value = false;
                const blob = value?.thumbnail ?? value?.blob;
                lease?.release();
                lease = undefined;
                const previousSource = source.value;
                if (blob) {
                    lease = imageUrlCache.acquire(
                        `${id}:${value!.updatedAt}:preview`,
                        blob,
                    );
                    source.value = lease.url;
                } else source.value = sourceUrl.value;
                if (previousSource !== source.value) imageError.value = false;
            },
            error(error: unknown) {
                reading.value = false;
                readError.value =
                    error instanceof Error
                        ? error.message
                        : '图片读取失败，请重新打开编辑。';
            },
        });
        onCleanup(() => {
            revision++;
            subscription.unsubscribe();
            lease?.release();
        });
    },
    { immediate: true },
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
                    : '本地副本保存失败，请重试。';
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
