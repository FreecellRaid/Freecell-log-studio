import type { ImageAttachment, ImageResourceMetadata } from './resource';

export type ExportRowType =
    | 'message'
    | 'chunkSeparator'
    | 'documentSeparator'
    | 'image';
export interface ExportStyle {
    color?: string;
    bold?: boolean;
    italic?: boolean;
}
interface ExportMessageContext {
    playerName?: string;
    account?: string;
    time?: string;
    nameStyle?: ExportStyle;
    contentStyle?: ExportStyle;
}
export interface ExportMessageRow extends ExportMessageContext {
    type: 'message';
    content: string;
}
export interface ExportImageRow extends ExportMessageContext {
    type: 'image';
    image: ImageAttachment;
    content?: never;
}
export interface ExportSeparatorRow extends ExportMessageContext {
    type: 'chunkSeparator' | 'documentSeparator';
    content: string;
}
export type ExportRow = ExportMessageRow | ExportImageRow | ExportSeparatorRow;

// 通用资源上下文只持有本地数据和来源；具体的内嵌格式由适配器决定。
export interface ExportResource extends ImageResourceMetadata {
    resourceId: string;
    blob?: Blob;
    error?: string;
    updatedAt?: number;
}
export interface ExportResourceContext {
    resources: ReadonlyMap<string, ExportResource>;
    getDataUri(resourceId: string): Promise<string | undefined>;
}
export interface ExportAdapterOptions {
    enableMarkdown?: boolean;
    resources?: ExportResourceContext;
}
export interface ExportFormat {
    formatId: string;
    formatName: string;
    fileExtension: string;
    playerNameFormat: string;
    accountFormat: string;
    timeFormat: string;
    messageTemplate: string;
    imageTemplate: string;
    messageSeparator: string;
    docSeparator: string;
    chunkSeparator: string;
}
export const DEFAULT_IMAGE_TEMPLATE = '{{image}}';
export const DEFAULT_IMAGE_PLACEHOLDER = '[图片]';

// 只为旧模板补充缺失字段，保留用户已有布局和自行填写的占位文本。
export function normalizeExportFormat(
    format: Omit<ExportFormat, 'imageTemplate'> & { imageTemplate?: unknown },
): ExportFormat {
    return {
        ...format,
        imageTemplate:
            typeof format.imageTemplate === 'string'
                ? format.imageTemplate
                : DEFAULT_IMAGE_TEMPLATE,
    };
}
