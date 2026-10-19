import { describe, expect, it, vi } from 'vitest';
import { importFiles, importRows } from '@/io/import/importService';
import { prepareImportResources } from '@/io/import/importResources';
import { resourceRepository } from '@/io/storage/resourceStorage';
import type { ImageResourceMetadata } from '@/types/resource';
import type { ImportRow } from '@/types/import';

function persistence() {
    return vi.fn(async (metadata: ImageResourceMetadata[]) =>
        metadata.map((_, i) => `resource-${i}`),
    );
}

describe('import resource preparation', () => {
    it('registers references without downloading and retains image-only messages and attachment order', async () => {
        const persistResources = persistence();
        const download = vi.spyOn(resourceRepository, 'download');
        try {
            const [doc] = await importFiles(
                [
                    {
                        name: 'images',
                        format: 'standard-adapter',
                        text: 'Alice(123) 2026/10/20 12:00:00\n[CQ:image,file=first,url=https://example.com/a.png]<img src="https://example.com/b.png" alt="第二张">',
                    },
                ],
                0,
                { persistResources },
            );
            const message = doc.chunks[0].messages[0];
            expect(message.content).toBe('');
            expect(message.images?.map((image) => image.name)).toEqual([
                'first',
                '第二张',
            ]);
            expect(message.images?.map((image) => image.resourceId)).toEqual([
                'resource-0',
                'resource-1',
            ]);
            expect(
                new Set(message.images?.map((image) => image.imageId)).size,
            ).toBe(2);
            expect(persistResources).toHaveBeenCalledOnce();
            expect(download).not.toHaveBeenCalled();
        } finally {
            download.mockRestore();
        }
    });
    it('deduplicates URLs across rows while giving every attachment its own identity', async () => {
        const persistResources = persistence();
        const rows: ImportRow[] = [
            {
                content: '',
                resources: [
                    {
                        type: 'image',
                        name: '第一张',
                        url: './map.png',
                        source: 'html',
                    },
                ],
            },
            {
                content: '',
                resources: [
                    {
                        type: 'image',
                        name: '第二张',
                        url: 'https://example.com/log/map.png',
                        source: 'cq',
                    },
                ],
            },
        ];
        const doc = await importRows(rows, 'test', 0, {
            persistResources,
            baseUrl: 'https://example.com/log/index.html',
        });
        expect(persistResources.mock.calls[0][0]).toHaveLength(1);
        const images = doc.chunks[0].messages.map(
            (message) => message.images![0],
        );
        expect(images[0].resourceId).toBe(images[1].resourceId);
        expect(images[0].imageId).not.toBe(images[1].imageId);
        expect(rows[0]).not.toHaveProperty('images');
    });
    it.each([
        'file:///tmp/map.png',
        'javascript:alert(1)',
        'data:image/png;base64,AA',
        'https://user:pass@example.com/a.png',
        './local.png',
    ])(
        'keeps unavailable URL %s as metadata without a downloadable link',
        async (url) => {
            const persistResources = persistence();
            const doc = await importRows(
                [
                    {
                        content: '',
                        resources: [
                            {
                                type: 'image',
                                url,
                                source: 'html',
                                original: `<img src="${url}">`,
                            },
                        ],
                    },
                ],
                'placeholder',
                0,
                { persistResources },
            );
            expect(persistResources.mock.calls[0][0][0]).toMatchObject({
                sourceUrl: undefined,
                provenance: { kind: 'html', original: `<img src="${url}">` },
            });
            expect(doc.chunks[0].messages[0].images).toHaveLength(1);
        },
    );
    it('keeps CQ file identifiers without a link', async () => {
        const persistResources = persistence();
        const [doc] = await importFiles(
            [
                {
                    name: 'seal',
                    text: JSON.stringify({
                        version: 101,
                        items: [
                            {
                                nickname: 'Alice',
                                IMUserId: '123',
                                time: 1,
                                isDice: false,
                                message: '[CQ:image,file=ABC.image]',
                            },
                        ],
                    }),
                },
            ],
            0,
            { persistResources },
        );
        expect(doc.chunks[0].messages[0].images?.[0].name).toBe('ABC.image');
        expect(persistResources.mock.calls[0][0][0].sourceUrl).toBeUndefined();
    });
    it('extracts HTML images through the Ccfolia adapter and resolves against the entry base URL', async () => {
        const persistResources = persistence();
        const [doc] = await importFiles(
            [
                {
                    name: 'html',
                    baseUrl: 'https://example.com/log/index.html',
                    text: '<title>ccfolia - logs</title><p style="color: #fff;"><span>main</span><span>Alice</span> : <span><img src="./a.png" alt="地图"></span></p>',
                },
            ],
            0,
            { persistResources },
        );
        expect(doc.chunks[0].messages[0].images?.[0].name).toBe('地图');
        expect(persistResources.mock.calls[0][0][0].sourceUrl).toBe(
            'https://example.com/log/a.png',
        );
    });
    it('does not reinterpret structured log text as CQ or HTML', async () => {
        const persistResources = persistence();
        const content = '[CQ:image,file=literal]<img src="literal.png">';
        const [doc] = await importFiles(
            [
                {
                    name: 'plain',
                    text: JSON.stringify({
                        schema: 'freecell-log',
                        version: 1,
                        messages: [{ content }],
                    }),
                },
            ],
            0,
            { persistResources },
        );
        expect(doc.chunks[0].messages[0].content).toBe(content);
        expect(persistResources).not.toHaveBeenCalled();
    });
    it('does not return a document when persistence fails', async () => {
        await expect(
            importRows(
                [{ content: '', resources: [{ type: 'image' }] }],
                'test',
                0,
                {
                    persistResources: vi
                        .fn()
                        .mockRejectedValue(new Error('quota')),
                },
            ),
        ).rejects.toThrow('quota');
    });
    it('discards registration results when cancelled', async () => {
        const controller = new AbortController();
        let resolve!: (ids: string[]) => void;
        const registering = prepareImportResources(
            [{ content: '', resources: [{ type: 'image' }] }],
            {
                signal: controller.signal,
                persistResources: () =>
                    new Promise((done) => {
                        resolve = done;
                    }),
            },
        );
        controller.abort();
        resolve(['orphan']);
        await expect(registering).rejects.toThrow();
    });
});
