import { normalizeImageUrl } from '@/utils/imageUrl';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectDatabase } from '@/io/storage/database';
import {
    createResourceRepository,
} from '@/io/storage/resourceStorage';
import { createProjectRepository } from '@/io/storage/projectStorage';
import { imageMimeType, MAX_IMAGE_BYTES } from '@/io/storage/imageProcessing';
import { base64ToBlob } from '@/io/storage/resourceEncoding';
import { migrateProjectFileTo } from '@/io/storage/projectFile';
import {
    projectFileToWorkspace,
    workspaceProjectToFile,
} from '@/io/storage/workspaceProject';
import { createImageUrlCache } from '@/io/storage/imageUrlCache';

const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVEkAAAAASUVORK5CYII=';
const blob = () => base64ToBlob(png, 'image/png');
async function prepare(image: Blob) {
    return {
        mimeType: await imageMimeType(image),
        byteLength: image.size,
        width: 1,
        height: 1,
        thumbnail: image,
    };
}
function file() {
    return migrateProjectFileTo({
        projectId: 'test',
        projectName: 'images',
        documents: [
            {
                docId: 'doc',
                docIndex: 0,
                docName: 'doc',
                chunks: [
                    {
                        chunkId: 'chunk',
                        chunkIndex: 0,
                        chunkName: 'chunk',
                        messages: [
                            {
                                messageId: 'message',
                                content: 'text',
                                time: '2026-10-19T00:00:00Z',
                            },
                        ],
                    },
                ],
            },
        ],
    }).project;
}

describe('image resource persistence', () => {
    let database: ProjectDatabase;
    let resources: ReturnType<typeof createResourceRepository>;
    let sequence = 0;
    beforeEach(() => {
        database = new ProjectDatabase(`resource-test-${++sequence}`);
        resources = createResourceRepository({ database, prepare });
    });
    afterEach(async () => {
        vi.restoreAllMocks();
        await database.delete();
    });
    it('registers imported links and unresolved placeholders together without downloading', async () => {
        const ids = await resources.addImported([
            {
                type: 'image',
                sourceUrl: 'https://example.com/map.png',
                provenance: { kind: 'html', original: '<img src="map.png">' },
            },
            {
                type: 'image',
                provenance: {
                    kind: 'cq',
                    original: '[CQ:image,file=ABC.image]',
                },
            },
        ]);
        expect(ids).toHaveLength(2);
        expect(await resources.get(ids[0])).toMatchObject({
            sourceUrl: 'https://example.com/map.png',
            provenance: { kind: 'html' },
        });
        expect((await resources.get(ids[0]))?.blob).toBeUndefined();
        expect(await resources.get(ids[1])).toMatchObject({
            sourceUrl: undefined,
            provenance: { kind: 'cq' },
        });
    });
    it('rolls back all imported metadata when batch persistence fails', async () => {
        vi.spyOn(database.resources, 'bulkAdd').mockImplementationOnce(
            (records) =>
                Dexie.Promise.resolve().then(async () => {
                    await database.resources.add(records[0]);
                    throw new Error('quota');
                }),
        );
        await expect(
            resources.addImported([{ type: 'image' }, { type: 'image' }]),
        ).rejects.toThrow('quota');
        expect(await database.resources.count()).toBe(0);
    });

    it('stores original bytes and thumbnail as Blobs, not Base64', async () => {
        const id = await resources.addLocal(blob(), 'map.png');
        const stored = (await resources.get(id))!;
        expect(stored.blob).toBeInstanceOf(Blob);
        expect(stored.thumbnail).toBeInstanceOf(Blob);
        expect(stored).not.toHaveProperty('data');
        expect(stored.provenance?.original).toBe('map.png');
        expect(await stored.blob!.arrayBuffer()).toEqual(
            await blob().arrayBuffer(),
        );
    });

    it('preserves image order and bytes through save, reload, export and import', async () => {
        const project = file();
        const id = await resources.addLocal(blob(), 'map.png');
        const remote = await resources.addRemote(
            'https://example.com/image.png',
        );
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'one', resourceId: id, name: '地图' },
            { imageId: 'two', resourceId: remote, name: '链接' },
        ];
        const repository = createProjectRepository({
            database,
            legacyStorage: () => ({ getItem: () => null }),
        });
        await repository.save(project);
        const saved = (await repository.get(project.projectId))!;
        expect(saved.resources[id]).not.toHaveProperty('data');
        expect(saved.resources[id]?.byteLength).toBe(blob().size);
        const runtime = projectFileToWorkspace(saved);
        expect(
            runtime.documents[0].chunks[0].messages[0].images?.map(
                (image) => image.name,
            ),
        ).toEqual(['地图', '链接']);
        const exported = await resources.exportProject(
            workspaceProjectToFile(runtime),
        );
        expect(exported.resources[id]?.data?.value).toBe(png);
        expect(exported.resources[remote]?.sourceUrl).toBe(
            'https://example.com/image.png',
        );
        const imported = await resources.importProject(exported);
        const ids = imported.documents[0].chunks[0].messages[0].images.map(
            (image) => image.resourceId,
        );
        expect(ids).not.toContain(id);
        expect((await resources.get(ids[0]!))!.blob!.size).toBe(blob().size);
        expect(imported.resources[ids[0]!]).not.toHaveProperty('data');
    });

    it('remaps conflicting IDs without overwriting another project resource', async () => {
        const project = file();
        const id = await resources.addRemote(
            'https://example.com/original.png',
        );
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'one', resourceId: id, name: 'new' },
        ];
        project.resources[id] = {
            type: 'image',
            sourceUrl: 'https://example.com/new.png',
        };
        const staged = await resources.stageProject(project);
        expect(
            staged.project.documents[0].chunks[0].messages[0].images[0]
                .resourceId,
        ).not.toBe(id);
        expect((await resources.get(id))?.sourceUrl).toBe(
            'https://example.com/original.png',
        );
    });

    it('rolls back new blobs if the project write fails', async () => {
        const project = file();
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'one', resourceId: 'inline', name: 'map' },
        ];
        project.resources.inline = {
            type: 'image',
            mimeType: 'image/png',
            byteLength: blob().size,
            data: { encoding: 'base64', value: png },
        };
        const repository = createProjectRepository({
            database,
            legacyStorage: () => ({ getItem: () => null }),
        });
        await repository.initialize();
        vi.spyOn(database.projects, 'put').mockRejectedValueOnce(
            new DOMException('full', 'QuotaExceededError'),
        );
        await expect(repository.save(project)).rejects.toMatchObject({
            reason: 'quota',
        });
        expect(await database.resources.count()).toBe(0);
        expect(await database.projects.count()).toBe(0);
    });

    it('retains missing attachments and omits unreferenced resources from exports', async () => {
        const project = file();
        project.resources.unused = {
            type: 'image',
            sourceUrl: 'https://example.com/unused.png',
        };
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'one', resourceId: 'missing', name: '待修复' },
        ];
        const exported = await resources.exportProject(project);
        expect(exported.resources).toEqual({ missing: { type: 'image' } });
        expect(exported.documents[0].chunks[0].messages[0].images).toHaveLength(
            1,
        );
    });

    it('supplies a shared local copy while retaining the original URL, provenance and references', async () => {
        const [id] = await resources.addImported([
            {
                type: 'image',
                sourceUrl: 'https://example.com/map.png',
                provenance: { kind: 'cq', original: '[CQ:image,file=map]' },
            },
        ]);
        const project = file();
        const images = [
            { imageId: 'one', resourceId: id, name: '第一张' },
            { imageId: 'two', resourceId: id, name: '第二张' },
        ];
        project.documents[0].chunks[0].messages[0].images = images;
        await resources.saveLocalCopy(id, blob());
        const record = (await resources.get(id))!;
        expect(record.sourceUrl).toBe('https://example.com/map.png');
        expect(record.provenance).toEqual({
            kind: 'cq',
            original: '[CQ:image,file=map]',
        });
        expect(record.blob?.size).toBe(blob().size);
        expect(record.thumbnail).toBeInstanceOf(Blob);
        const exported = await resources.exportProject(project);
        expect(exported.documents[0].chunks[0].messages[0].images).toEqual(
            images,
        );
        expect(exported.resources[id].data?.value).toBe(png);
        expect(exported.resources[id].sourceUrl).toBe(
            'https://example.com/map.png',
        );
        await expect(resources.saveLocalCopy(id, blob())).rejects.toThrow(
            '已有本地副本',
        );
    });
    it('retains the link when a supplied image is invalid or persistence fails', async () => {
        const id = await resources.addRemote('https://example.com/map.png');
        await expect(
            resources.saveLocalCopy(id, new Blob(['invalid'])),
        ).rejects.toThrow();
        vi.spyOn(database.resources, 'update').mockRejectedValueOnce(
            new Error('quota'),
        );
        await expect(resources.saveLocalCopy(id, blob())).rejects.toThrow(
            'quota',
        );
        expect((await resources.get(id))?.blob).toBeUndefined();
        expect((await resources.get(id))?.sourceUrl).toBe(
            'https://example.com/map.png',
        );
        await expect(
            resources.saveLocalCopy('missing', blob()),
        ).rejects.toThrow('不存在');
    });
    it('does not overwrite a supplied local copy when an earlier download finishes', async () => {
        let finish!: (response: Response) => void;
        const fetch = vi.fn<typeof globalThis.fetch>().mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        resources = createResourceRepository({ database, prepare, fetch });
        const id = await resources.addRemote('https://example.com/map.png');
        const downloading = resources.download(id);
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        await resources.saveLocalCopy(id, blob());
        finish(new Response(new Blob([blob(), 'downloaded'])));
        await downloading;
        expect((await resources.get(id))?.blob?.size).toBe(blob().size);
    });
    it('downloads once, retaining the source link and original bytes', async () => {
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValue(new Response(blob()));
        resources = createResourceRepository({ database, prepare, fetch });
        const id = await resources.addRemote('https://example.com/image.png');
        await resources.download(id);
        await resources.download(id);
        const record = (await resources.get(id))!;
        expect(record.sourceUrl).toBe('https://example.com/image.png');
        expect(record.blob?.size).toBe(blob().size);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('keeps remote metadata after a failed download and permits retry', async () => {
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(new Response('', { status: 403 }))
            .mockImplementationOnce(async () => new Response(blob()));
        resources = createResourceRepository({ database, prepare, fetch });
        const id = await resources.addRemote('https://example.com/image.png');
        await expect(resources.download(id)).rejects.toThrow('403');
        expect((await resources.get(id))?.sourceUrl).toBe(
            'https://example.com/image.png',
        );
        await resources.download(id);
        expect((await resources.get(id))?.blob).toBeInstanceOf(Blob);
    });

    it('rejects oversized remote responses without discarding the link', async () => {
        resources = createResourceRepository({
            database,
            prepare,
            fetch: vi.fn().mockResolvedValue(
                new Response('', {
                    headers: {
                        'content-length': String(MAX_IMAGE_BYTES + 1),
                    },
                }),
            ),
        });
        const id = await resources.addRemote('https://example.com/image.png');
        await expect(resources.download(id)).rejects.toThrow('20 MB');
        expect((await resources.get(id))?.blob).toBeUndefined();
    });

    it('upgrades database v1 embedded images to independent blobs', async () => {
        const old = new Dexie(database.name);
        old.version(1).stores({
            projects: '&projectId, time',
            migrations: '&key',
        });
        const project = file();
        project.resources.inline = {
            type: 'image',
            mimeType: 'image/png',
            byteLength: blob().size,
            data: { encoding: 'base64', value: png },
        };
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'one', resourceId: 'inline', name: 'map' },
        ];
        await old.table('projects').put(project);
        old.close();
        await database.open();
        const updated = (await database.projects.get(project.projectId))!;
        const id =
            updated.documents[0].chunks[0].messages[0].images[0].resourceId;
        expect(id).not.toBe('inline');
        expect(updated.resources[id]).not.toHaveProperty('data');
        expect((await resources.get(id))?.blob?.size).toBe(blob().size);
    });
});

describe('image input and display references', () => {
    it.each([
        'file:///tmp/image.png',
        'blob:temporary',
        '../image.png',
        'javascript:alert(1)',
        'https://user:password@example.com/image.png',
    ])('rejects invalid image URL %s', (url) => {
        expect(() => normalizeImageUrl(url)).toThrow();
    });
    it('checks bytes rather than trusting a file extension or declared MIME', async () => {
        await expect(
            imageMimeType(new Blob(['not an image'], { type: 'image/png' })),
        ).rejects.toThrow('PNG');
        await expect(
            imageMimeType(new Blob([], { type: 'image/png' })),
        ).rejects.toThrow('20 MB');
        expect(await imageMimeType(blob())).toBe('image/png');
    });
    it('shares live object URLs and revokes only after the last consumer leaves', () => {
        const create = vi.fn(() => 'blob:test');
        const revoke = vi.fn();
        const cache = createImageUrlCache(create, revoke);
        const a = cache.acquire('one', blob());
        const b = cache.acquire('one', blob());
        expect(create).toHaveBeenCalledTimes(1);
        a.release();
        a.release();
        expect(revoke).not.toHaveBeenCalled();
        b.release();
        expect(revoke).toHaveBeenCalledWith('blob:test');
    });
});
