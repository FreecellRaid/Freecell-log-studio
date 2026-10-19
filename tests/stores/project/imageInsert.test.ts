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
    function prepareEdit() {
        const message = useLogStore().allMessages[0];
        message.images = [
            { imageId: 'first', resourceId: 'shared', name: '第一张' },
            { imageId: 'second', resourceId: 'shared', name: '第二张' },
            { imageId: 'third', resourceId: 'other', name: '第三张' },
        ];
        useHistoryStore().clearHistory();
        useImageInsertStore().open(message.messageId, 'first');
        return message;
    }
    it('renames and reorders together with one undo and retains the attachment identity', async () => {
        prepareEdit();
        await useImageInsertStore().saveEdit({ name: '新名称', position: 3 });
        expect(
            useLogStore().allMessages[0].images?.map((image) => image.imageId),
        ).toEqual(['second', 'third', 'first']);
        expect(useLogStore().allMessages[0].images?.[2]).toEqual({
            imageId: 'first',
            resourceId: 'shared',
            name: '新名称',
        });
        expect(resourceRepository.addLocal).not.toHaveBeenCalled();
        expect(resourceRepository.addRemote).not.toHaveBeenCalled();
        useHistoryStore().undo();
        expect(useLogStore().allMessages[0].images?.[0]).toEqual({
            imageId: 'first',
            resourceId: 'shared',
            name: '第一张',
        });
        expect(
            useLogStore().allMessages[0].images?.map((image) => image.imageId),
        ).toEqual(['first', 'second', 'third']);
    });
    it('replaces only the edited resource while preserving other references and undo', async () => {
        prepareEdit();
        await useImageInsertStore().saveEdit({
            name: '地图',
            position: 1,
            file: new File(['data'], 'map.png'),
        });
        expect(
            useLogStore().allMessages[0].images?.map(
                (image) => image.resourceId,
            ),
        ).toEqual(['local', 'shared', 'other']);
        useHistoryStore().undo();
        expect(
            useLogStore().allMessages[0].images?.map(
                (image) => image.resourceId,
            ),
        ).toEqual(['shared', 'shared', 'other']);
    });
    it('downloads a replacement link in the background', async () => {
        prepareEdit();
        await useImageInsertStore().saveEdit({
            name: '链接',
            position: 1,
            url: 'https://example.com/new.png',
        });
        expect(resourceRepository.addRemote).toHaveBeenCalledWith(
            'https://example.com/new.png',
        );
        expect(useLogStore().allMessages[0].images?.[0].resourceId).toBe(
            'remote',
        );
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalled(),
        );
    });
    it('does not create history for an unchanged edit', async () => {
        prepareEdit();
        await useImageInsertStore().saveEdit({ name: '第一张', position: 1 });
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
    it('does not restore an image deleted during resource replacement', async () => {
        const message = prepareEdit();
        let resolve!: (value: string) => void;
        vi.mocked(resourceRepository.addLocal).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const saving = useImageInsertStore().saveEdit({
            name: '地图',
            position: 1,
            file: new File(['data'], 'map.png'),
        });
        message.images = message.images!.filter(
            (image) => image.imageId !== 'first',
        );
        resolve('orphan');
        await saving;
        expect(useImageInsertStore().error).toContain('目标图片已变更');
        expect(message.images.map((image) => image.imageId)).toEqual([
            'second',
            'third',
        ]);
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
    it('leaves images untouched when replacement is cancelled or fails', async () => {
        prepareEdit();
        let resolve!: (value: string) => void;
        vi.mocked(resourceRepository.addLocal).mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            }),
        );
        const store = useImageInsertStore();
        const saving = store.saveEdit({
            name: '地图',
            position: 2,
            file: new File(['data'], 'map.png'),
        });
        store.close();
        resolve('orphan');
        await saving;
        expect(useLogStore().allMessages[0].images?.[0].resourceId).toBe(
            'shared',
        );
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
        store.open(useLogStore().allMessages[0].messageId, 'first');
        vi.mocked(resourceRepository.addRemote).mockRejectedValueOnce(
            new Error('quota exceeded'),
        );
        await store.saveEdit({
            name: '新名称',
            position: 2,
            url: 'https://example.com/map.png',
        });
        expect(store.error).toBe('quota exceeded');
        expect(useLogStore().allMessages[0].images?.[0].name).toBe('第一张');
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
    it('rejects invalid positions without changing the message', async () => {
        prepareEdit();
        await useImageInsertStore().saveEdit({ name: '修改', position: 4 });
        expect(useImageInsertStore().error).toContain('图片顺序');
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });
});
