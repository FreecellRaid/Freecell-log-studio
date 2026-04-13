export type RoleType = 'gm' | 'pl' | 'ob' | 'bot' | 'npc' | 'unknown';

export function isRoleType(value: unknown): value is RoleType {
    return (
        value === 'gm' ||
        value === 'pl' ||
        value === 'ob' ||
        value === 'bot' ||
        value === 'npc' ||
        value === 'unknown'
    );
}

export interface Message {
    messageId: string;
    chunkId: string;
    messageIndex: number; //chunk内索引
    playerName: string;
    account: string;
    time: Date;
    content: string;
    isOoc: boolean;
    isCommand: boolean;
    role: RoleType;
    note: string;
}

type StringFilterValue = string | string[] | RegExp;
type NumberFilterValue = number | number[];

export interface MessageFilter {
    messageId?: StringFilterValue;
    chunkId?: StringFilterValue;
    messageIndex?: NumberFilterValue;
    playerName?: StringFilterValue;
    account?: StringFilterValue;
    time?: Date;
    content?: StringFilterValue;
    isOoc?: boolean;
    isCommand?: boolean;
    role?: RoleType;
    note?: StringFilterValue;
}

export interface Chunk {
    chunkId: string;
    docId: string;
    chunkName: string;
    chunkIndex: number;
    messages: Message[];
}

export interface LogDocument {
    docId: string;
    docName: string;
    docIndex: number;
    chunks: Chunk[];
    isExpanded?: boolean;
}
