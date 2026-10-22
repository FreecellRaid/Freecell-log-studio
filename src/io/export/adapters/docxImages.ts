import { sectionMarginDefaults, sectionPageSizeDefaults } from 'docx';
import type { ExportResource } from '@/types/export';
import { imageMimeType } from '@/io/storage/imageProcessing';

export interface DocxImageData {
    type: 'png' | 'jpg' | 'gif';
    data: Uint8Array;
    width: number;
    height: number;
}

// DOCX 默认 A4、四边一英寸；twip / 15 为 96 DPI 像素，留出一行高度。
const PAGE_WIDTH =
    (sectionPageSizeDefaults.WIDTH -
        sectionMarginDefaults.LEFT -
        sectionMarginDefaults.RIGHT) /
    15;
const PAGE_HEIGHT =
    (sectionPageSizeDefaults.HEIGHT -
        sectionMarginDefaults.TOP -
        sectionMarginDefaults.BOTTOM) /
        15 -
    24;
export function fitDocxImage(width: number, height: number) {
    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        width * height > 32_000_000
    )
        throw new Error('图片尺寸无效。');
    const scale = Math.min(1, PAGE_WIDTH / width, PAGE_HEIGHT / height);
    return { width: width * scale, height: height * scale };
}

async function decodeImage(blob: Blob) {
    if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(blob);
        return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            release: () => bitmap.close(),
        };
    }
    const url = URL.createObjectURL(blob);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('图片无法解码。'));
            image.src = url;
        });
        return {
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            release: () => URL.revokeObjectURL(url),
        };
    } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
    }
}

export async function prepareDocxImage(
    resource: ExportResource,
): Promise<DocxImageData> {
    if (!resource.blob) throw new Error('图片没有本地副本。');
    const mime = await imageMimeType(resource.blob);
    const needsDecode =
        mime === 'image/webp' || !resource.width || !resource.height;
    const decoded = needsDecode ? await decodeImage(resource.blob) : undefined;
    try {
        const width = decoded?.width ?? resource.width!;
        const height = decoded?.height ?? resource.height!;
        const size = fitDocxImage(width, height);
        let blob = resource.blob;
        let type: DocxImageData['type'] =
            mime === 'image/jpeg'
                ? 'jpg'
                : mime === 'image/gif'
                  ? 'gif'
                  : 'png';
        if (mime === 'image/webp') {
            // Word 原生不支持 WebP，按原始像素转成 PNG，不使用缩略图。
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context || !decoded) throw new Error('无法转换 WebP 图片。');
            context.drawImage(decoded.source, 0, 0);
            blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                    (value) =>
                        value
                            ? resolve(value)
                            : reject(new Error('图片转换失败。')),
                    'image/png',
                ),
            );
            type = 'png';
        }
        return {
            type,
            data: new Uint8Array(await blob.arrayBuffer()),
            ...size,
        };
    } finally {
        decoded?.release();
    }
}
