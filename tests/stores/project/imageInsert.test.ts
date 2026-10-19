import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { useImageInsertStore } from '@/stores/editor/imageInsertStore';
import { useLogStore } from '@/stores/project/logStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { buildLogDocument } from '@/io/import/parser';

vi.mock('@/io/storage/resourceStorage', async (original) => ({
    ...(await original<typeof import('@/io/storage/resourceStorage')>()),
    resourceRepository: {
        addLocal: vi.fn(),
        addRemote: vi.fn(),
        get: vi.fn(),
        download: vi.fn(),
    },
}));

describe('single-message image insertion', () => {
    let pinia: ReturnType<typeof createPinia>;
    beforeEach(() => {
        vi.resetAllMocks();
        pinia = createPinia();
        setActivePinia(pinia);
        useLogStore().replaceDocuments([
            buildLogDocument([{ content: 'original' }], 'log', 0),
        ]);
        useHistoryStore().clearHistory();
        vi.mocked(resourceRepository.addLocal).mockResolvedValue('local');
        vi.mocked(resourceRepository.addRemote).mockResolvedValue('remote');
        vi.mocked(resourceRepository.get).mockResolvedValue({
            type: 'image',
            resourceId: 'remote',
            sourceUrl: 'https://example.com/map.png',
            updatedAt: 1,
        });
        vi.mocked(resourceRepository.download).mockResolvedValue();
        useImageInsertStore().open(useLogStore().allMessages[0].messageId);
    });
    afterEach(async () => {
        await vi.waitFor(() =>
            expect(useResourceTasksStore().pendingCount).toBe(0),
        );
        disposePinia(pinia);
        vi.restoreAllMocks();
    });

    it('opens a blocking modal and appends a local attachment without modifying text', async () => {
        const store = useImageInsertStore();
        expect(useWindowStore().topModal?.windowName).toBe('imageInsert');
        await store.insert({
            files: [new File(['data'], 'map.png')],
            name: '地图',
        });
        const message = useLogStore().allMessages[0];
        expect(message.content).toBe('original');
        expect(message.images).toEqual([
            expect.objectContaining({ resourceId: 'local', name: '地图' }),
        ]);
        expect(useWindowStore().topModal).toBeNull();
        useHistoryStore().undo();
        expect(useLogStore().allMessages[0].images?.length ?? 0).toBe(0);
        useHistoryStore().redo();
        expect(useLogStore().allMessages[0].images).toHaveLength(1);
    });
    it('inserts a URL immediately and keeps the attachment after background download failure', async () => {
        vi.mocked(resourceRepository.download).mockRejectedValue(
            new Error('CORS'),
        );
        await useImageInsertStore().insert({
            url: 'https://example.com/map.png',
        });
        expect(useLogStore().allMessages[0].images![0].resourceId).toBe(
            'remote',
        );
        await vi.waitFor(() =>
            expect(useResourceTasksStore().states.remote?.status).toBe('error'),
        );
        expect(useLogStore().allMessages[0].images).toHaveLength(1);
    });
    it('does not attach a completed upload after cancellation', async () => {
        let resolve!: (value: string) => void;
        vi.mocked(resourceRepository.addLocal).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const store = useImageInsertStore();
        const inserting = store.insert({
            files: [new File(['data'], 'map.png')],
        });
        store.close();
        resolve('orphan');
        await inserting;
        expect(useLogStore().allMessages[0].images).toBeUndefined();
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
    it('does not attach to another project if the workspace changes during upload', async () => {
        let resolve!: (value: string) => void;
        vi.mocked(resourceRepository.addLocal).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const store = useImageInsertStore();
        const inserting = store.insert({
            files: [new File(['data'], 'map.png')],
        });
        useLogStore().clearData();
        resolve('orphan');
        await inserting;
        expect(store.error).toContain('工作区');
        expect(useLogStore().allMessages).toHaveLength(0);
    });
    it('leaves the message unchanged when resource persistence fails', async () => {
        vi.mocked(resourceRepository.addLocal).mockRejectedValueOnce(
            new Error('quota exceeded'),
        );
        const store = useImageInsertStore();
        await store.insert({ files: [new File(['data'], 'map.png')] });
        expect(store.error).toBe('quota exceeded');
        expect(useLogStore().allMessages[0].images).toBeUndefined();
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
});
