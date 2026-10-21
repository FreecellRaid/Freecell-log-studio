import { ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { resourceRepository } from '@/io/storage/resourceStorage';
import type { ImageResourceSummary } from '@/types/resource';

// 批量列表只订阅元数据，不持有全部原图或创建预览 URL。
export function useResourceSummaries(ids: MaybeRefOrGetter<string[]>) {
    const summaries = shallowRef(new Map<string, ImageResourceSummary>());
    const reading = ref(false);
    const readError = ref('');
    watch(
        () => [...toValue(ids)],
        (value, _old, onCleanup) => {
            summaries.value = new Map();
            readError.value = '';
            const currentIds = [...new Set(value)];
            reading.value = !!currentIds.length;
            if (!currentIds.length) return;
            let closed = false;
            const subscription = resourceRepository
                .observeSummaries(currentIds)
                .subscribe({
                    next(records) {
                        if (closed) return;
                        summaries.value = new Map(
                            records
                                .filter((record) => !!record)
                                .map((record) => [record.resourceId, record]),
                        );
                        reading.value = false;
                        readError.value = '';
                    },
                    error() {
                        if (!closed) {
                            reading.value = false;
                            readError.value = '资源读取失败，请重新打开面板。';
                        }
                    },
                });
            onCleanup(() => {
                closed = true;
                subscription.unsubscribe();
            });
        },
        { immediate: true },
    );
    return { summaries, reading, readError };
}
