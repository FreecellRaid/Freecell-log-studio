import {
    computed,
    ref,
    shallowRef,
    toValue,
    watch,
    type MaybeRefOrGetter,
} from 'vue';
import type { ExportRow } from '@/types/export';
import { resourceRepository } from '@/io/storage/resourceStorage';
import {
    createExportResourceContext,
    exportResourceFromRecord,
    exportResourceIds,
} from '@/io/export/exportResources';

// 预览订阅原图快照，下载完成后自动刷新；不使用编辑器缩略图。
export function useExportResources(
    rows: MaybeRefOrGetter<readonly ExportRow[]>,
) {
    const context = shallowRef(createExportResourceContext([]));
    const reading = ref(false);
    const readError = ref('');
    const ids = computed<string[]>((previous) => {
        const next = exportResourceIds(toValue(rows));
        return previous &&
            previous.length === next.length &&
            previous.every((id, index) => id === next[index])
            ? previous
            : next;
    });
    watch(
        ids,
        (current, _old, onCleanup) => {
            context.value = createExportResourceContext([]);
            readError.value = '';
            reading.value = !!current.length;
            if (!current.length) return;
            let closed = false;
            const subscription = resourceRepository
                .observeExportResources(current)
                .subscribe({
                    next(records) {
                        if (closed) return;
                        context.value = createExportResourceContext(
                            records.map((record, index) =>
                                record
                                    ? exportResourceFromRecord(record)
                                    : {
                                          type: 'image',
                                          resourceId: current[index]!,
                                          error: '资源缺失',
                                      },
                            ),
                        );
                        reading.value = false;
                        readError.value = '';
                    },
                    error() {
                        if (closed) return;
                        reading.value = false;
                        readError.value = '图片资源读取失败，暂以占位符显示。';
                    },
                });
            onCleanup(() => {
                closed = true;
                subscription.unsubscribe();
            });
        },
        { immediate: true },
    );
    return { context, reading, readError };
}
