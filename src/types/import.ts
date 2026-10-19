import type { RoleType, LogSource } from './log';

export interface ImportResource {
    type: 'image';
    name?: string;
    url?: string;
    original?: string;
    source?: 'cq' | 'html';
}

export interface ContentParseOptions {
    syntax: 'plain' | 'cq' | 'html' | 'mixed';
}

export interface ParsedContent {
    content: string;
    resources?: ImportResource[];
}

// Adapter 只需要尽力提取, Parser 进行兜底补全
export interface ImportRow {
    playerName?: string;
    account?: string;
    content: string;
    resources?: ImportResource[];
    time?: Date;
    note?: string;
    originalMessageId?: string;
    role?: RoleType;
    isOoc?: boolean;
    isCommand?: boolean;
    meta?: Record<string, unknown>; // 用于存放特殊平台元信息
}

export interface ImportAdapter {
    id: string;
    name: string;
    /**
     * 嗅探探针：根据传入的文本样本，返回匹配度得分
     * @param sampleLines 采样文本行数组
     * @returns 匹配成功的行数得分
     */
    test: (sampleLines: string[]) => number;
    /**
     * 解析逻辑：将原始文本转换为中间层格式
     * @param text 仅统一换行等基础预处理后的完整文本
     */
    parse: (text: string) => ImportRow[];
}

export interface ImportTextEntry {
    name: string;
    text: string;
    format?: string;
    baseUrl?: string;
    source?: LogSource;
}
