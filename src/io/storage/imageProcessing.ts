export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 32_000_000;

export async function imageMimeType(blob: Blob): Promise<string> {
    if (!blob.size || blob.size > MAX_IMAGE_BYTES)
        throw new Error('图片须大于 0 字节且不超过 20 MB。');
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const ascii = String.fromCharCode(...bytes);
    if (
        [137, 80, 78, 71, 13, 10, 26, 10].every(
            (value, i) => bytes[i] === value,
        )
    )
        return 'image/png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        return 'image/jpeg';
    if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a'))
        return 'image/gif';
    if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')
        return 'image/webp';
    throw new Error('暂支持 PNG、JPEG、GIF 和 WebP 图片，请检查文件内容。');
}

export async function prepareImage(blob: Blob) {
    const mimeType = await imageMimeType(blob);
    let source: ImageBitmap | HTMLImageElement;
    let objectUrl: string | undefined;
    if (typeof createImageBitmap === 'function')
        source = await createImageBitmap(blob);
    else {
        objectUrl = URL.createObjectURL(blob);
        try {
            source = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('图片无法解码。'));
                image.src = objectUrl!;
            });
        } catch (error) {
            URL.revokeObjectURL(objectUrl);
            throw error;
        }
    }
    try {
        const width =
            'naturalWidth' in source ? source.naturalWidth : source.width;
        const height =
            'naturalHeight' in source ? source.naturalHeight : source.height;
        if (!width || !height || width * height > MAX_IMAGE_PIXELS)
            throw new Error('图片尺寸无效或超过 3200 万像素。');
        const scale = Math.min(1, 480 / width, 480 / height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        let thumbnail: Blob | undefined;
        if (context) {
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            thumbnail = await new Promise<Blob | undefined>((resolve) =>
                canvas.toBlob(
                    (value) => resolve(value ?? undefined),
                    'image/webp',
                    0.82,
                ),
            );
        }
        return { mimeType, byteLength: blob.size, width, height, thumbnail };
    } finally {
        if ('close' in source) source.close();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
}
