import type { Message, Chunk, LogDocument, MessageFilter } from './log';
import type { StyleRule, ViewSettings } from './style';
import type { ImageAttachment, ImageResourceMetadata } from './resource';

// 文件 DTO 与运行时类型分开；Blob、Date、RegExp 不直接进入 JSON。
export const PROJECT_SCHEMA = 'freecell-project' as const;
export const PROJECT_SCHEMA_VERSION = 3 as const;

export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type ImageAttachmentFile = ImageAttachment;

export interface ImageResourceFile extends ImageResourceMetadata {
    data?: { encoding: 'base64'; value: string };
}

export interface RegExpFile {
    type: 'regexp';
    source: string;
    flags: string;
}

type StringFilterFile = string | string[] | RegExpFile;
export type MessageFilterFile = Omit<
    MessageFilter,
    | 'messageId'
    | 'chunkId'
    | 'playerName'
    | 'account'
    | 'content'
    | 'note'
    | 'time'
    | 'timeStart'
    | 'timeEnd'
> & {
    messageId?: StringFilterFile;
    chunkId?: StringFilterFile;
    playerName?: StringFilterFile;
    account?: StringFilterFile;
    content?: StringFilterFile;
    note?: StringFilterFile;
    time?: string;
    timeStart?: string;
    timeEnd?: string;
    hasImage?: boolean;
};

export interface MessageFile extends Omit<Message, 'time' | 'meta'> {
    time: string;
    meta?: Record<string, JsonValue>;
    images: ImageAttachmentFile[];
}

export interface ChunkFile extends Omit<Chunk, 'messages'> {
    messages: MessageFile[];
}

export interface DocumentFile extends Omit<LogDocument, 'chunks'> {
    chunks: ChunkFile[];
}

export interface StyleRuleFile extends Omit<StyleRule, 'filter'> {
    filter: MessageFilterFile;
}

export interface ProjectFile {
    schema: typeof PROJECT_SCHEMA;
    version: typeof PROJECT_SCHEMA_VERSION;
    projectId: string;
    projectName: string;
    time: string;
    documents: DocumentFile[];
    resources: Record<string, ImageResourceFile>;
    styleRules: StyleRuleFile[];
    viewSettings: ViewSettings;
}
