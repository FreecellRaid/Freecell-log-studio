import type { ImageResourceFile } from '@/types/projectFile';
import { imageMetadata, type ImageResourceRecord } from '@/types/resource';

export function base64ToBlob(value: string, mimeType: string): Blob {
    const decoded = atob(value);
    const bytes = Uint8Array.from(decoded, (character) =>
        character.charCodeAt(0),
    );
    return new Blob([bytes], { type: mimeType });
}

export async function blobToBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 32768)
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 32768)));
    return btoa(chunks.join(''));
}

export function resourceFileToRecord(
    resourceId: string,
    file: ImageResourceFile,
): ImageResourceRecord {
    return {
        ...imageMetadata(file),
        resourceId,
        updatedAt: Date.now(),
        ...(file.data
            ? { blob: base64ToBlob(file.data.value, file.mimeType!) }
            : {}),
    };
}
