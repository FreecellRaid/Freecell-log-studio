import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia } from 'pinia';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { resourceRepository } from '@/io/storage/resourceStorage';

vi.mock('@/io/storage/resourceStorage', () => ({
    resourceRepository: { get: vi.fn(), download: vi.fn() },
}));

describe('image download queue', () => {
    let pinia: ReturnType<typeof createPinia>;
    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        vi.resetAllMocks();
        vi.mocked(resourceRepository.get).mockImplementation(async (id) => ({
            type: 'image',
            resourceId: id,
            sourceUrl: `https://example.com/${id}.png`,
            updatedAt: 1,
        }));
    });
    afterEach(() => {
        disposePinia(pinia);
    });
    it('caps concurrency at three and deduplicates requests', async () => {
        const resolvers: (() => void)[] = [];
        vi.mocked(resourceRepository.download).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvers.push(resolve);
                }),
        );
        const store = useResourceTasksStore();
        for (const id of ['a', 'b', 'c', 'd', 'e']) store.enqueue(id);
        store.enqueue('a');
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledTimes(3),
        );
        expect(store.pendingCount).toBe(5);
        resolvers[0]!();
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledTimes(4),
        );
        resolvers[1]!();
        resolvers[2]!();
        resolvers[3]!();
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledTimes(5),
        );
        resolvers[4]!();
        await vi.waitFor(() => expect(store.pendingCount).toBe(0));
    });
    it('cancels active and queued downloads while permitting a manual retry', async () => {
        vi.mocked(resourceRepository.download).mockImplementation(
            (_id, signal) =>
                new Promise((_resolve, reject) => {
                    signal!.addEventListener(
                        'abort',
                        () => reject(new DOMException('aborted', 'AbortError')),
                        { once: true },
                    );
                }),
        );
        const store = useResourceTasksStore();
        for (const id of ['a', 'b', 'c', 'd']) store.enqueue(id);
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledTimes(3),
        );
        store.cancel('d');
        store.cancel('a');
        store.cancel('b');
        store.cancel('c');
        await vi.waitFor(() => expect(store.pendingCount).toBe(0));
        expect(store.states.a?.status).toBe('cancelled');
        expect(store.states.d?.status).toBe('cancelled');
        vi.mocked(resourceRepository.download).mockResolvedValue();
        store.enqueue('d', true);
        await vi.waitFor(() => expect(store.states.d?.status).toBe('ready'));
    });
});
