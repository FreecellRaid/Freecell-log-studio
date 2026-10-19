import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { useFileImport } from '@/composables/application/useImporter';
import { useLogStore } from '@/stores/project/logStore';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { resourceRepository } from '@/io/storage/resourceStorage';
import type { ImageResourceRecord } from '@/types/resource';

vi.mock('@/io/storage/resourceStorage', async (original) => ({
    ...(await original<typeof import('@/io/storage/resourceStorage')>()),
    resourceRepository: {
        addImported: vi.fn(),
        get: vi.fn(),
        download: vi.fn(),
    },
}));

const entry = {
    name: 'image log',
    format: 'standard-adapter',
    text: 'Alice(123) 2026/10/20 12:00:00\n[CQ:image,file=map,url=https://example.com/map.png][CQ:image,file=local.image]',
};

describe('image import application lifecycle', () => {
    let pinia: ReturnType<typeof createPinia>;
    beforeEach(() => {
        vi.resetAllMocks();
        pinia = createPinia();
        setActivePinia(pinia);
        const records = new Map<string, ImageResourceRecord>();
        vi.mocked(resourceRepository.addImported).mockImplementation(
            async (metadata) =>
                metadata.map((resource, i) => {
                    const id = `resource-${i}`;
                    records.set(id, {
                        ...resource,
                        resourceId: id,
                        updatedAt: 1,
                    });
                    return id;
                }),
        );
        vi.mocked(resourceRepository.get).mockImplementation(async (id) =>
            records.get(id),
        );
        vi.mocked(resourceRepository.download).mockResolvedValue();
    });
    afterEach(async () => {
        await vi.waitFor(() =>
            expect(useResourceTasksStore().pendingCount).toBe(0),
        );
        disposePinia(pinia);
        vi.restoreAllMocks();
    });
    it('starts downloads only after documents are applied and skips placeholders', async () => {
        const importer = useFileImport();
        const documents = await importer.prepareLogDocuments([entry]);
        expect(useLogStore().documents).toHaveLength(0);
        expect(resourceRepository.download).not.toHaveBeenCalled();
        vi.mocked(resourceRepository.download).mockImplementation(async () => {
            expect(useLogStore().allMessages[0].images).toHaveLength(2);
        });
        importer.applyLogDocuments(documents);
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledOnce(),
        );
        expect(vi.mocked(resourceRepository.download).mock.calls[0][0]).toBe(
            'resource-0',
        );
    });
    it('does not wait for image downloading when importing a log', async () => {
        let finish!: () => void;
        vi.mocked(resourceRepository.download).mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    finish = resolve;
                }),
        );
        try {
            expect(await useFileImport().importTextAndApply([entry])).toBe(1);
            expect(useLogStore().allMessages[0].content).toBe('');
            await vi.waitFor(() =>
                expect(resourceRepository.download).toHaveBeenCalledOnce(),
            );
            expect(useResourceTasksStore().pendingCount).toBe(1);
        } finally {
            finish?.();
        }
    });
    it('supports resources in the direct ImportRow application entry point', async () => {
        await useFileImport().importRowsAndApply(
            [
                {
                    content: '',
                    resources: [
                        {
                            type: 'image',
                            name: '地图',
                            url: 'https://example.com/map.png',
                        },
                    ],
                },
            ],
            'rows',
        );
        expect(useLogStore().allMessages[0].images?.[0].name).toBe('地图');
        await vi.waitFor(() =>
            expect(resourceRepository.download).toHaveBeenCalledOnce(),
        );
    });
    it('does not partially apply a batch if a later log cannot be parsed', async () => {
        await expect(
            useFileImport().importTextAndApply([
                entry,
                { name: 'bad', text: 'not a log' },
            ]),
        ).rejects.toThrow('解析失败');
        expect(useLogStore().documents).toHaveLength(0);
        expect(resourceRepository.download).not.toHaveBeenCalled();
    });
    it('does not attach an old import to a workspace switched during registration', async () => {
        let finish!: (ids: string[]) => void;
        vi.mocked(resourceRepository.addImported).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const importing = useFileImport().importTextAndApply([entry]);
        useLogStore().clearData();
        finish(['orphan-1', 'orphan-2']);
        await expect(importing).rejects.toThrow('工作区已切换');
        expect(useLogStore().documents).toHaveLength(0);
        expect(resourceRepository.download).not.toHaveBeenCalled();
    });
    it('does not commit or start downloads after a prepared remote import is cancelled', async () => {
        let finish!: (ids: string[]) => void;
        vi.mocked(resourceRepository.addImported).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const controller = new AbortController();
        const importing = useFileImport().prepareLogDocuments(
            [entry],
            controller.signal,
        );
        controller.abort();
        finish(['orphan-1', 'orphan-2']);
        await expect(importing).rejects.toThrow();
        expect(useLogStore().documents).toHaveLength(0);
        expect(resourceRepository.download).not.toHaveBeenCalled();
    });
});
