import type {
    ExportResource,
    ExportResourceContext,
    ExportRow,
} from '@/types/export';
import type { ImageResourceRecord } from '@/types/resource';
import { imageMetadata } from '@/types/resource';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { blobToBase64 } from '@/io/storage/resourceEncoding';
import { imageSourceUrl } from '@/editor/imageResourceState';

export function exportResourceIds(rows: readonly ExportRow[]): string[] {
    return [
        ...new Set(
            rows
                .filter((row) => row.type === 'image')
                .map((row) => row.image.resourceId),
        ),
    ];
}

export function createExportResourceContext(
    records: Iterable<ExportResource>,
): ExportResourceContext {
    const resources = new Map(
        [...records].map((record) => [
            record.resourceId,
            {
                ...record,
                sourceUrl: imageSourceUrl(record.sourceUrl) || undefined,
            },
        ]),
    );
    const encoded = new Map<string, Promise<string | undefined>>();
    return {
        resources,
        getDataUri(id) {
            const resource = resources.get(id);
            if (!resource?.blob) return Promise.resolve(undefined);
            if (!encoded.has(id))
                encoded.set(
                    id,
                    blobToBase64(resource.blob).then(
                        (data) =>
                            `data:${resource.mimeType || resource.blob!.type || 'application/octet-stream'};base64,${data}`,
                    ),
                );
            return encoded.get(id)!;
        },
    };
}
export function exportResourceFromRecord(
    record: ImageResourceRecord,
): ExportResource {
    return {
        ...imageMetadata(record),
        resourceId: record.resourceId,
        blob: record.blob,
        updatedAt: record.updatedAt,
    };
}

// 每次导出形成独立快照，按 ID 去重读取；此入口绝不下载远程资源。
export async function prepareExportResources(
    rows: readonly ExportRow[],
    options: {
        readResource?: (id: string) => Promise<ImageResourceRecord | undefined>;
        signal?: AbortSignal;
    } = {},
): Promise<ExportResourceContext> {
    options.signal?.throwIfAborted();
    const ids = exportResourceIds(rows);
    const results = await Promise.allSettled(
        ids.map(async (id) =>
            (options.readResource ?? resourceRepository.get)(id),
        ),
    );
    options.signal?.throwIfAborted();
    return createExportResourceContext(
        results.map((result, index): ExportResource => {
            if (result.status === 'fulfilled' && result.value)
                return exportResourceFromRecord(result.value);
            return {
                type: 'image',
                resourceId: ids[index]!,
                error:
                    result.status === 'rejected' ? '资源读取失败' : '资源缺失',
            };
        }),
    );
}
