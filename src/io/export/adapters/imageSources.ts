import {
    DEFAULT_IMAGE_PLACEHOLDER,
    type ExportResourceContext,
} from '@/types/export';
import type { RenderedExportSegment } from '../exportRender';
import { imageSourceUrl } from '@/editor/imageResourceState';
import { blobToBase64 } from '@/io/storage/resourceEncoding';

export type ImageExportSegment = Extract<
    RenderedExportSegment,
    { type: 'image' }
>;

export function imageFallback(segment: ImageExportSegment): string {
    return (
        imageSourceUrl(segment.resource?.sourceUrl) || DEFAULT_IMAGE_PLACEHOLDER
    );
}

// 一次适配调用内按资源去重，编码失败也只降级该图片，不触发远程下载。
export function createImageSourceResolver(context?: ExportResourceContext) {
    const sources = new Map<string, Promise<string>>();
    return (segment: ImageExportSegment): Promise<string> => {
        if (!sources.has(segment.resourceId))
            sources.set(
                segment.resourceId,
                (async () => {
                    const resource = segment.resource;
                    if (resource?.blob) {
                        try {
                            const uri = context
                                ? await context.getDataUri(segment.resourceId)
                                : `data:${resource.mimeType || resource.blob.type};base64,${await blobToBase64(resource.blob)}`;
                            if (uri) return uri;
                        } catch {
                            // 保留来源链接；没有链接时使用通用占位符。
                        }
                    }
                    return imageFallback(segment);
                })(),
            );
        return sources.get(segment.resourceId)!;
    };
}
