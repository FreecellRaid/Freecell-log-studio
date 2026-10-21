import { imageResourceText } from '@/data/imageResourceText';
import {
    computed,
    ref,
    shallowRef,
    toValue,
    watch,
    type MaybeRefOrGetter,
} from 'vue';
import type { ImageResourceRecord } from '@/types/resource';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { imageUrlCache } from '@/io/storage/imageUrlCache';
import { imageSourceUrl } from '@/editor/imageResourceState';

// 调用方决定可见性；编辑弹窗持续订阅，虚拟列表的缩略图只在可见时订阅。
export function useImageResource(
    id: MaybeRefOrGetter<string | undefined>,
    enabled: MaybeRefOrGetter<boolean> = true,
) {
    const record = shallowRef<ImageResourceRecord>();
    const reading = ref(false);
    const readError = ref('');
    const source = ref('');
    const sourceUrl = computed(() => imageSourceUrl(record.value?.sourceUrl));
    watch(
        [() => toValue(id), () => toValue(enabled)],
        ([resourceId, show], _old, onCleanup) => {
            record.value = undefined;
            source.value = '';
            readError.value = '';
            reading.value = !!resourceId;
            if (!resourceId || !show) return;
            let closed = false;
            let lease: ReturnType<typeof imageUrlCache.acquire> | undefined;
            const subscription = resourceRepository
                .observe(resourceId)
                .subscribe({
                    next(value) {
                        if (closed) return;
                        record.value = value;
                        reading.value = false;
                        readError.value = '';
                        const blob = value?.thumbnail ?? value?.blob;
                        const nextLease = blob
                            ? imageUrlCache.acquire(
                                  `${resourceId}:${value!.updatedAt}:preview`,
                                  blob,
                              )
                            : undefined;
                        lease?.release();
                        lease = nextLease;
                        source.value = lease?.url ?? sourceUrl.value;
                    },
                    error(error: unknown) {
                        if (closed) return;
                        reading.value = false;
                        readError.value =
                            error instanceof Error
                                ? error.message
                                : imageResourceText.errors.read;
                    },
                });
            onCleanup(() => {
                closed = true;
                subscription.unsubscribe();
                lease?.release();
            });
        },
        { immediate: true, flush: 'sync' },
    );
    return { record, reading, readError, source, sourceUrl };
}
