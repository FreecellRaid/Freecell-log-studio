import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { useExportResources } from '@/composables/resources/useExportResources';
import { resourceRepository } from '@/io/storage/resourceStorage';
import type { ExportRow } from '@/types/export';
import type { ImageResourceRecord } from '@/types/resource';
vi.mock('@/io/storage/resourceStorage', () => ({
    resourceRepository: { observeExportResources: vi.fn() },
}));
type Observer = {
    next(records: (ImageResourceRecord | undefined)[]): void;
    error(): void;
};
describe('导出预览资源订阅', () => {
    let scope: ReturnType<typeof effectScope>;
    const observers: Observer[] = [];
    const stops: ReturnType<typeof vi.fn>[] = [];
    const image = (resourceId: string): ExportRow => ({
        type: 'image',
        image: { resourceId, imageId: resourceId, name: '图片' },
    });
    beforeEach(() => {
        scope = effectScope();
        observers.length = 0;
        stops.length = 0;
        vi.resetAllMocks();
        vi.mocked(resourceRepository.observeExportResources).mockImplementation(
            () =>
                ({
                    subscribe(observer: Observer) {
                        observers.push(observer);
                        const stop = vi.fn();
                        stops.push(stop);
                        return { unsubscribe: stop };
                    },
                }) as unknown as ReturnType<
                    typeof resourceRepository.observeExportResources
                >,
        );
    });
    afterEach(() => scope.stop());
    it('同资源多图片和正文编辑不重复订阅，本地副本准备完成后直接刷新上下文', async () => {
        const rows = ref([image('a'), image('a')]);
        const query = scope.run(() => useExportResources(rows))!;
        expect(
            resourceRepository.observeExportResources,
        ).toHaveBeenCalledExactlyOnceWith(['a']);
        observers[0]!.next([
            {
                type: 'image',
                resourceId: 'a',
                sourceUrl: 'https://example.com/a.png',
                updatedAt: 1,
            },
        ]);
        rows.value = [image('a'), { type: 'message', content: '新正文' }];
        await nextTick();
        expect(resourceRepository.observeExportResources).toHaveBeenCalledTimes(
            1,
        );
        const blob = new Blob(['original']);
        observers[0]!.next([
            { type: 'image', resourceId: 'a', blob, updatedAt: 2 },
        ]);
        expect(query.context.value.resources.get('a')?.blob).toBe(blob);
        expect(query.reading.value).toBe(false);
    });
    it('切换工程/资源后忽略旧回调，关闭预览释放订阅', async () => {
        const rows = ref([image('old')]);
        const query = scope.run(() => useExportResources(rows))!;
        rows.value = [image('new')];
        await nextTick();
        observers[0]!.next([
            { type: 'image', resourceId: 'old', updatedAt: 1 },
        ]);
        observers[0]!.error();
        expect(query.context.value.resources.size).toBe(0);
        expect(query.readError.value).toBe('');
        observers[1]!.next([undefined]);
        expect(query.context.value.resources.get('new')?.error).toBe(
            '资源缺失',
        );
        scope.stop();
        expect(stops.every((stop) => stop.mock.calls.length === 1)).toBe(true);
    });
    it('读取失败显示占位，清空图片列表后不保留旧错误', async () => {
        const rows = ref([image('a')]);
        const query = scope.run(() => useExportResources(rows))!;
        observers[0]!.error();
        expect(query.readError.value).toContain('占位符');
        rows.value = [];
        await nextTick();
        expect(query.readError.value).toBe('');
        expect(query.reading.value).toBe(false);
    });
});
