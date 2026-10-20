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
    it('summarizes only requested resources, ignoring duplicate references and previous projects', () => {
        const store = useResourceTasksStore();
        Object.assign(store.states, {
            a: { status: 'ready' },
            b: { status: 'loading' },
            c: { status: 'queued' },
            d: { status: 'error', error: 'CORS' },
            e: { status: 'cancelled' },
            previous: { status: 'error' },
        });
        expect(
            store.summarize(['a', 'a', 'b', 'c', 'd', 'e', 'missing']),
        ).toEqual({
            total: 5,
            ready: 1,
            loading: 1,
            queued: 1,
            error: 1,
            cancelled: 1,
            pending: 2,
        });
        expect(store.summarize([]).total).toBe(0);
    });
    it('stops both queued and active downloads only in the requested scope', async () => {
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
        for (const id of ['a', 'b', 'other', 'queued']) store.enqueue(id);
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledTimes(3),
        );
        store.cancelAll(['a', 'b', 'queued']);
        await vi.waitFor(() =>
            expect(store.summarize(['a', 'b', 'queued']).cancelled).toBe(3),
        );
        expect(store.states.other?.status).toBe('loading');
        expect(resourceRepository.download).toHaveBeenCalledTimes(3);
        store.cancel('other');
        await vi.waitFor(() => expect(store.pendingCount).toBe(0));
    });
    it('retries failures and resumes stopped tasks separately without restarting completed or unrelated tasks', async () => {
        const store = useResourceTasksStore();
        Object.assign(store.states, {
            failed: { status: 'error' },
            stopped: { status: 'cancelled' },
            ready: { status: 'ready' },
            other: { status: 'error' },
        });
        vi.mocked(resourceRepository.download).mockResolvedValue();
        store.retryFailed(['failed', 'stopped', 'ready']);
        await vi.waitFor(() =>
            expect(store.states.failed?.status).toBe('ready'),
        );
        expect(store.states.stopped?.status).toBe('cancelled');
        expect(store.states.other?.status).toBe('error');
        store.resumeCancelled(['failed', 'stopped', 'ready']);
        await vi.waitFor(() =>
            expect(store.states.stopped?.status).toBe('ready'),
        );
        expect(
            vi
                .mocked(resourceRepository.download)
                .mock.calls.map((call) => call[0]),
        ).toEqual(['failed', 'stopped']);
    });
    it('does not start a download cancelled while reading its metadata', async () => {
        let finish!: (
            value: Awaited<ReturnType<typeof resourceRepository.get>>,
        ) => void;
        vi.mocked(resourceRepository.get).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const store = useResourceTasksStore();
        store.enqueue('a');
        store.cancel('a');
        finish({
            type: 'image',
            resourceId: 'a',
            sourceUrl: 'https://example.com/a.png',
            updatedAt: 1,
        });
        await vi.waitFor(() =>
            expect(store.states.a?.status).toBe('cancelled'),
        );
        expect(resourceRepository.download).not.toHaveBeenCalled();
    });
    it('retains the stopped status if a download ignores cancellation and later resolves', async () => {
        let finish!: () => void;
        vi.mocked(resourceRepository.download).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const store = useResourceTasksStore();
        store.enqueue('a');
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledOnce(),
        );
        store.cancel('a');
        finish();
        await vi.waitFor(() =>
            expect(store.states.a?.status).toBe('cancelled'),
        );
        expect(store.pendingCount).toBe(0);
    });
});
