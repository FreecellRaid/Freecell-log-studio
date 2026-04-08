export type ExportRowType =
    | 'message'
    | 'chunkSeparator'
    | 'documentSeparator'
    | 'image'; // 图片（预留）

export interface ExportStyle {
    color?: string;
    bold?: boolean;
    italic?: boolean;
}

export interface ExportRow {
    type: ExportRowType;

    content: string; //这里把分隔符也视作一种特殊消息处理
    playerName?: string;
    account?: string;
    time?: string;
    nameStyle?: ExportStyle;
    contentStyle?: ExportStyle;
}

export interface ExportFormat {
    formatId: string;
    formatName: string;
    fileExtension: string; // 后缀名 (.txt, .md)

    // 字段模板
    playerNameFormat: string; // "[{{name}}]"
    accountFormat: string; // "({{account}})"
    timeFormat: string; // "{{time}}"

    // 整体布局模板
    // "{{time}} {{name}}{{account}}\n{{content}}"
    messageTemplate: string;

    // 物理分隔符
    messageSeparator: string;
    docSeparator: string;
    chunkSeparator: string;
}
