import type { ExportRow, ExportFormat, ExportStyle } from '@/types/export';
import { parseTemplate, getPlaceholderValue } from '../templateParser';

// ===== TEXT ADAPTER =====

export function textAdapter(rows: ExportRow[], format: ExportFormat): string {
    const msgTokens = parseTemplate(format.messageTemplate);

    return rows
        .map((row) => {
            if (row.type === 'documentSeparator') {
                return format.docSeparator.replace('{{name}}', row.content);
            }
            if (row.type === 'chunkSeparator') {
                return format.chunkSeparator.replace('{{name}}', row.content);
            }
            if (row.type === 'message') {
                return msgTokens
                    .map((token) => {
                        switch (token.type) {
                            case 'placeholder':
                                return getPlaceholderValue(
                                    token.value,
                                    row,
                                    format,
                                );
                            case 'newline':
                                return '\n';
                            case 'tab':
                                return '\t';
                            default:
                                return token.value;
                        }
                    })
                    .join('');
            }
            return '';
        })
        .filter(Boolean)
        .join(format.messageSeparator.replace(/\\n/g, '\n')); // 支持分隔符中的 \n
}

// ===== HTML ADAPTER =====

function styleToCss(style?: ExportStyle): string {
    if (!style) return '';
    const css: string[] = [];
    if (style.color) css.push(`color: ${style.color}`);
    if (style.bold) css.push('font-weight: bold');
    if (style.italic) css.push('font-style: italic');
    return css.join('; ');
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function htmlAdapter(rows: ExportRow[], format: ExportFormat): string {
    const msgTokens = parseTemplate(format.messageTemplate);

    const body = rows
        .map((row) => {
            if (row.type === 'documentSeparator') {
                const text = format.docSeparator.replace(
                    '{{name}}',
                    escapeHtml(row.content),
                );
                return `<div class="doc"><h3>${text}</h3></div>`;
            }
            if (row.type === 'chunkSeparator') {
                const text = format.chunkSeparator.replace(
                    '{{name}}',
                    escapeHtml(row.content),
                );
                return `<div class="chunk"><h4>${text}</h4></div>`;
            }
            if (row.type === 'message') {
                const htmlContent = msgTokens
                    .map((token) => {
                        switch (token.type) {
                            case 'placeholder':
                                const val = getPlaceholderValue(
                                    token.value,
                                    row,
                                    format,
                                );
                                const style =
                                    token.value === 'content'
                                        ? row.contentStyle
                                        : row.nameStyle;
                                const css = styleToCss(style);
                                return css
                                    ? `<span style="${css}">${escapeHtml(val)}</span>`
                                    : escapeHtml(val);
                            case 'newline':
                                return '<br/>';
                            case 'tab':
                                return '&emsp;&emsp;';
                            default:
                                return escapeHtml(token.value);
                        }
                    })
                    .join('');
                return `<div class="msg">${htmlContent}</div>`;
            }
            return '';
        })
        .join('\n');

    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
    body{
    white-space:pre-wrap;
    font-family:sans-serif;
    padding:20px}
    .msg{margin-bottom:8px}
    .doc{text-align:center}
    </style>
    </head>
    <body>${body}</body>
    </html>`;
}

// ===== DOC ADAPTER (Word 兼容 HTML) =====

export function docAdapter(rows: ExportRow[], format: ExportFormat): string {
    // 复用 HTML Adapter，但添加特定的 Word 命名空间，提高 Microsoft Word 的兼容性
    const html = htmlAdapter(rows, format);
    return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head><body>${html}</body></html>`;
}