export interface ImageAttachment {
    imageId: string;
    resourceId: string;
    name: string;
}

export interface ImageResourceMetadata {
    type: 'image';
    sourceUrl?: string;
    mimeType?: string;
    byteLength?: number;
    width?: number;
    height?: number;
    provenance?: { kind: 'upload' | 'url' | 'cq' | 'html'; original: string };
}

export interface ImageResourceRecord extends ImageResourceMetadata {
    resourceId: string;
    blob?: Blob;
    thumbnail?: Blob;
    updatedAt: number;
}

export function imageMetadata(
    resource: ImageResourceMetadata,
): ImageResourceMetadata {
    const { type, sourceUrl, mimeType, byteLength, width, height, provenance } =
        resource;
    return {
        type,
        sourceUrl,
        mimeType,
        byteLength,
        width,
        height,
        provenance: provenance ? { ...provenance } : undefined,
    };
}
