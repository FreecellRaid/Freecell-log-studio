import type { ImportRow } from '@/types/import';
import type { ImageAttachment, ImageResourceMetadata } from '@/types/resource';
import {
    resourceRepository,
    normalizeImageUrl,
} from '@/io/storage/resourceStorage';
import { generateId } from '@/utils/id';

export interface ImportResourceOptions {
    baseUrl?: string;
    signal?: AbortSignal;
    // 由应用层在配额不足时清理并重试，避免导入服务依赖状态仓库。
    persistResources?: (
        resources: ImageResourceMetadata[],
    ) => Promise<string[]>;
}

export async function prepareImportResources(
    rows: ImportRow[],
    options: ImportResourceOptions = {},
) {
    options.signal?.throwIfAborted();
    const metadata: ImageResourceMetadata[] = [];
    const references: { row: ImportRow; name: string; index: number }[] = [];
    const byUrl = new Map<string, number>();
    for (const row of rows) {
        for (const resource of row.resources ?? []) {
            let sourceUrl: string | undefined;
            try {
                if (resource.url)
                    sourceUrl = normalizeImageUrl(
                        new URL(resource.url, options.baseUrl).href,
                    );
            } catch {
                /* 无法解析的图片保留为可编辑占位，避免丢失来源信息。 */
            }
            let index = sourceUrl ? byUrl.get(sourceUrl) : undefined;
            if (index === undefined) {
                index = metadata.length;
                metadata.push({
                    type: 'image',
                    sourceUrl,
                    provenance: {
                        kind: resource.source ?? 'url',
                        original: resource.original ?? resource.url ?? '',
                    },
                });
                if (sourceUrl) byUrl.set(sourceUrl, index);
            }
            references.push({
                row,
                name: resource.name?.trim() || '图片',
                index,
            });
        }
    }
    const attachments = new Map<ImportRow, ImageAttachment[]>();
    if (!metadata.length) return attachments;
    const ids = await (
        options.persistResources ?? resourceRepository.addImported
    )(metadata);
    options.signal?.throwIfAborted();
    if (ids.length !== metadata.length)
        throw new Error('图片资源登记不完整，未导入日志。');
    for (const reference of references) {
        const images = attachments.get(reference.row) ?? [];
        images.push({
            imageId: generateId(),
            resourceId: ids[reference.index]!,
            name: reference.name,
        });
        attachments.set(reference.row, images);
    }
    return attachments;
}
