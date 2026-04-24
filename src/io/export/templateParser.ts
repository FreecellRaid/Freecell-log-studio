import type { ExportRow, ExportFormat } from '@/types/export';

type TokenType = 'text' | 'placeholder' | 'newline' | 'tab';

export interface TemplateToken {
    type: TokenType;
    value: string;
}

export function normalizeExportContentNewlines(content: string): string {
    return content.replace(/\r\n?/g, '\n');
}

export function parseTemplate(template: string): TemplateToken[] {
    const tokens: TemplateToken[] = [];

    // (\{\{.*?\}\}) : 匹配占位符
    // (\\n|\n)     : 匹配字面量 \n 字符串或实际换行符
    // (\\t|\t)     : 匹配字面量 \t 字符串或实际制表符
    const regex = /(\{\{.*?\}\}|\\n|\n|\\t|\t)/g;
    const parts = template.split(regex);

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('{{') && part.endsWith('}}')) {
            tokens.push({ type: 'placeholder', value: part.slice(2, -2) });
        } else if (part === '\\n' || part === '\n') {
            tokens.push({ type: 'newline', value: '\n' });
        } else if (part === '\\t' || part === '\t') {
            tokens.push({ type: 'tab', value: '\t' });
        } else {
            tokens.push({ type: 'text', value: part });
        }
    }

    return tokens;
}

export function getPlaceholderValue(
    key: string,
    row: ExportRow,
    format: ExportFormat,
): string {
    switch (key) {
        case 'name':
            return row.playerName
                ? format.playerNameFormat.replace('{{name}}', row.playerName)
                : '';
        case 'account':
            return row.account
                ? format.accountFormat.replace('{{account}}', row.account)
                : '';
        case 'time':
            return row.time
                ? format.timeFormat.replace('{{time}}', row.time)
                : '';
        case 'content':
            return row.content || '';
        default:
            return '';
    }
}
