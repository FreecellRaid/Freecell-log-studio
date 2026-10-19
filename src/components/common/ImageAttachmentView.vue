<template>
    <div ref="container" class="image-attachment-view">
        <div class="image-preview" :style="ratio">
            <img
                v-if="source"
                :src="source"
                :alt="attachment.name || '图片'"
                decoding="async"
                draggable="false"
                @load="imageError = false"
                @error="imageError = true"
            />
            <span v-else>{{ attachment.name || '图片' }}</span>
        </div>
        <p v-if="imageError || failure" class="image-state" role="status">
            {{ failure || '图片无法显示。' }}
        </p>
        <p v-else-if="!source" class="image-state">
            {{
                visible ? '图片资源缺失或正在读取…' : attachment.name || '图片'
            }}
        </p>
        <p
            v-if="task?.status === 'queued' || task?.status === 'loading'"
            class="image-state"
            role="status"
        >
            正在保存图片副本…
            <button
                type="button"
                @click.stop="tasks.cancel(attachment.resourceId)"
            >
                停止下载
            </button>
        </p>
        <p
            v-if="task?.status === 'error' || task?.status === 'cancelled'"
            class="image-state"
            role="status"
        >
            {{
                task.status === 'cancelled'
                    ? '下载已停止，保留原链接。'
                    : `副本未保存：${task.error}`
            }}
            <button
                type="button"
                @click.stop="tasks.enqueue(attachment.resourceId, true)"
            >
                重试
            </button>
        </p>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { ImageAttachment } from '@/types/resource';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { imageUrlCache } from '@/io/storage/imageUrlCache';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
const props = defineProps<{ attachment: ImageAttachment }>();
const tasks = useResourceTasksStore();
const task = computed(() => tasks.states[props.attachment.resourceId]);
const container = ref<HTMLElement | null>(null);
const visible = ref(false);
const source = ref('');
const failure = ref('');
const imageError = ref(false);
const ratio = ref<Record<string, string>>({ aspectRatio: '4 / 3' });
let observer: IntersectionObserver | undefined;
watch(
    [() => props.attachment.resourceId, visible],
    ([id, show], previous, onCleanup) => {
        if (previous?.[0] !== id) ratio.value = { aspectRatio: '4 / 3' };
        source.value = '';
        failure.value = '';
        imageError.value = false;
        if (!show) return;
        let lease: ReturnType<typeof imageUrlCache.acquire> | undefined;
        const subscription = resourceRepository.observe(id).subscribe({
            next(record) {
                lease?.release();
                lease = undefined;
                if (record?.width && record?.height)
                    ratio.value = {
                        aspectRatio: `${record.width} / ${record.height}`,
                    };
                const blob = record?.thumbnail ?? record?.blob;
                if (blob) {
                    lease = imageUrlCache.acquire(
                        `${id}:${record!.updatedAt}:preview`,
                        blob,
                    );
                    source.value = lease.url;
                } else source.value = record?.sourceUrl ?? '';
            },
            error(error: unknown) {
                failure.value =
                    error instanceof Error ? error.message : '图片读取失败。';
            },
        });
        onCleanup(() => {
            subscription.unsubscribe();
            lease?.release();
        });
    },
    { immediate: true },
);
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
    min-height: 80px;
    max-width: 480px;
}
.image-preview {
    width: 100%;
    max-height: 360px;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    color: var(--text-muted);
}
img {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 360px;
    object-fit: contain;
    border-radius: 4px;
    background: var(--bg-secondary);
}
.image-state {
    color: var(--text-muted);
    font-size: 12px;
    white-space: normal;
    overflow-wrap: anywhere;
    margin: 6px 0;
}
.image-state button {
    margin-left: 8px;
}
</style>
