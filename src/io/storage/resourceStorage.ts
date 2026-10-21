import { normalizeImageUrl } from '@/utils/imageUrl';
import { collectDocumentResourceIds } from '@/editor/resourceReferences';
import {
    protectResources,
    withResourceOperation,
} from './resourceCoordination';
import { liveQuery } from 'dexie';
import { projectDatabase, type ProjectDatabase } from './database';
import {
    imageMetadata,
    type ImageResourceMetadata,
    type ImageResourceRecord,
} from '@/types/resource';
import type { ProjectFile } from '@/types/projectFile';
import { generateId } from '@/utils/id';
import { blobToBase64, resourceFileToRecord } from './resourceEncoding';
import {
    imageMimeType,
    MAX_IMAGE_BYTES,
    prepareImage,
} from './imageProcessing';

async function sameBlob(a: Blob, b: Blob): Promise<boolean> {
    if (a.size !== b.size) return false;
    const [left, right] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
    const bytes = new Uint8Array(right);
    return new Uint8Array(left).every((value, i) => value === bytes[i]);
}

export function createResourceRepository(
    options: {
        database?: ProjectDatabase;
        prepare?: typeof prepareImage;
        fetch?: typeof fetch;
    } = {},
) {
    const database = options.database ?? projectDatabase;
    const prepare = options.prepare ?? prepareImage;
    const fetchImage =
        options.fetch ??
        ((...args: Parameters<typeof fetch>) => fetch(...args));
    async function get(id: string) {
        if (!database.isOpen()) await database.open();
        return database.resources.get(id);
    }
    async function addLocal(file: Blob, fileName: string) {
        const prepared = await prepare(file);
        if (!database.isOpen()) await database.open();
        const record: ImageResourceRecord = {
            type: 'image',
            resourceId: generateId(),
            ...prepared,
            blob: file.slice(0, file.size, prepared.mimeType),
            provenance: { kind: 'upload', original: fileName },
            updatedAt: Date.now(),
        };
        await database.resources.add(record);
        return record.resourceId;
    }
    async function addRemote(input: string) {
        const sourceUrl = normalizeImageUrl(input);
        if (!database.isOpen()) await database.open();
        const resourceId = generateId();
        await database.resources.add({
            type: 'image',
            resourceId,
            sourceUrl,
            provenance: { kind: 'url', original: input },
            updatedAt: Date.now(),
        });
        return resourceId;
    }
    async function saveLocalCopy(resourceId: string, file: Blob) {
        const prepared = await prepare(file);
        if (!database.isOpen()) await database.open();
        await database.transaction('rw', database.resources, async () => {
            const record = await database.resources.get(resourceId);
            if (!record)
                throw new Error('图片资源不存在，请重新选择要替换的图片。');
            if (record.blob)
                throw new Error('该资源已有本地副本，请刷新后查看。');
            // 只补全图片数据，保留原始链接、来源和全部附件引用。
            await database.resources.update(resourceId, {
                ...prepared,
                blob: file.slice(0, file.size, prepared.mimeType),
                updatedAt: Date.now(),
            });
        });
    }
    async function download(resourceId: string, signal?: AbortSignal) {
        const record = await get(resourceId);
        if (!record?.sourceUrl) throw new Error('图片没有可下载的来源链接。');
        if (record.blob) return;
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (signal?.aborted) abort();
        else signal?.addEventListener('abort', abort, { once: true });
        const timeout = setTimeout(() => controller.abort(), 20_000);
        try {
            const response = await fetchImage(
                normalizeImageUrl(record.sourceUrl),
                {
                    signal: controller.signal,
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                },
            );
            if (!response.ok)
                throw new Error(`图片下载失败（HTTP ${response.status}）。`);
            if (
                Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES
            )
                throw new Error('图片超过 20 MB。');
            const chunks: Uint8Array<ArrayBuffer>[] = [];
            let size = 0;
            if (response.body) {
                const reader = response.body.getReader();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        size += value.byteLength;
                        if (size > MAX_IMAGE_BYTES) {
                            controller.abort();
                            throw new Error('图片超过 20 MB。');
                        }
                        chunks.push(new Uint8Array(value));
                    }
                } finally {
                    await reader.cancel().catch(() => undefined);
                }
            } else {
                const buffer = await response.arrayBuffer();
                if (buffer.byteLength > MAX_IMAGE_BYTES)
                    throw new Error('图片超过 20 MB。');
                chunks.push(new Uint8Array(buffer));
            }
            const blob = new Blob(chunks);
            const prepared = await prepare(blob);
            if (controller.signal.aborted)
                throw new DOMException('Aborted', 'AbortError');
            await database.transaction('rw', database.resources, async () => {
                const current = await database.resources.get(resourceId);
                controller.signal.throwIfAborted();
                if (!current) throw new Error('图片资源已不存在。');
                // 下载期间可能已由用户补全副本，不覆盖用户上传的内容。
                if (current.blob) return;
                await database.resources.update(resourceId, {
                    ...prepared,
                    blob: blob.slice(0, blob.size, prepared.mimeType),
                    updatedAt: Date.now(),
                });
            });
        } catch (error) {
            if (
                controller.signal.aborted &&
                error instanceof Error &&
                error.name === 'AbortError'
            )
                throw new Error(
                    signal?.aborted
                        ? '图片下载已取消。'
                        : '图片下载超时，可稍后重试。',
                );
            throw error;
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', abort);
        }
    }

    // 在事务外准备 Blob 和内容比较；事务中仅执行 IndexedDB 操作。
    async function stageProject(input: ProjectFile, copyIds = false) {
        const project = JSON.parse(JSON.stringify(input)) as ProjectFile;
        const resources: ProjectFile['resources'] = {};
        const records: ImageResourceRecord[] = [];
        const mapping = new Map<string, string>();
        for (const originalId of collectDocumentResourceIds(
            project.documents,
        )) {
            const file = project.resources[originalId] ?? {
                type: 'image' as const,
            };
            const existing = copyIds ? undefined : await get(originalId);
            let record = resourceFileToRecord(originalId, file);
            if (record.blob) {
                const mime = await imageMimeType(record.blob);
                if (mime !== record.mimeType)
                    throw new Error('工程图片的 MIME 类型与数据不一致。');
            }
            const conflict =
                existing &&
                ((file.sourceUrl && file.sourceUrl !== existing.sourceUrl) ||
                    (record.blob &&
                        (!existing.blob ||
                            !(await sameBlob(record.blob, existing.blob)))));
            const id = copyIds || conflict ? generateId() : originalId;
            mapping.set(originalId, id);
            if (existing && !conflict) record = existing;
            else {
                record.resourceId = id;
                records.push(record);
            }
            resources[id] = imageMetadata(record);
        }
        project.documents.forEach((doc) =>
            doc.chunks.forEach((chunk) =>
                chunk.messages.forEach((message) => {
                    message.images.forEach((image) => {
                        image.resourceId =
                            mapping.get(image.resourceId) ?? image.resourceId;
                    });
                }),
            ),
        );
        project.resources = resources;
        return { project, records };
    }

    async function importProject(file: ProjectFile) {
        const staged = await stageProject(file, true);
        await database.transaction('rw', database.resources, async () => {
            for (const record of staged.records)
                await database.resources.add(record);
        });
        return staged.project;
    }
    async function exportProject(file: ProjectFile) {
        const project = JSON.parse(JSON.stringify(file)) as ProjectFile;
        const resources: ProjectFile['resources'] = {};
        for (const id of collectDocumentResourceIds(project.documents)) {
            const record = await get(id);
            resources[id] = record
                ? imageMetadata(record)
                : imageMetadata(project.resources[id] ?? { type: 'image' });
            if (record?.blob)
                resources[id]!.data = {
                    encoding: 'base64',
                    value: await blobToBase64(record.blob),
                };
            else if (project.resources[id]?.data)
                resources[id]!.data = project.resources[id]!.data;
        }
        project.resources = resources;
        return project;
    }

    return {
        get,
        addImported: (resources: ImageResourceMetadata[]) =>
            withResourceOperation(async () => {
                const records: ImageResourceRecord[] = resources.map(
                    (resource) => ({
                        ...imageMetadata(resource),
                        sourceUrl: resource.sourceUrl
                            ? normalizeImageUrl(resource.sourceUrl)
                            : undefined,
                        resourceId: generateId(),
                        updatedAt: Date.now(),
                    }),
                );
                await database.transaction('rw', database.resources, () =>
                    database.resources.bulkAdd(records),
                );
                const ids = records.map((record) => record.resourceId);
                protectResources(ids);
                return ids;
            }),
        addLocal: (file: Blob, name: string) =>
            withResourceOperation(async () => {
                const id = await addLocal(file, name);
                protectResources([id]);
                return id;
            }),
        addRemote: (url: string) =>
            withResourceOperation(async () => {
                const id = await addRemote(url);
                protectResources([id]);
                return id;
            }),
        saveLocalCopy: (id: string, file: Blob) =>
            withResourceOperation(async () => {
                protectResources([id]);
                await saveLocalCopy(id, file);
            }),
        download: (id: string, signal?: AbortSignal) =>
            withResourceOperation(() => download(id, signal)),
        stageProject,
        importProject: (file: ProjectFile) =>
            withResourceOperation(async () => {
                const imported = await importProject(file);
                protectResources(
                    collectDocumentResourceIds(imported.documents),
                );
                return imported;
            }),
        exportProject: (file: ProjectFile) =>
            withResourceOperation(() => exportProject(file)),
        // 列表只保留元数据和副本标志，缩略图由可见行按需读取。
        observeSummaries: (ids: string[]) =>
            liveQuery(async () => {
                const records = await database.resources.bulkGet(ids);
                return records.map((record) =>
                    record
                        ? {
                              ...imageMetadata(record),
                              resourceId: record.resourceId,
                              hasLocalCopy: !!record.blob,
                          }
                        : undefined,
                );
            }),
        observe: (id: string) => liveQuery(() => database.resources.get(id)),
    };
}

export const resourceRepository = createResourceRepository();
