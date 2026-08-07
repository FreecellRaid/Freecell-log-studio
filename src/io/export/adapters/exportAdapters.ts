import type {
    ExportAdapterOptions,
    ExportFormat,
    ExportRow,
    ExportStyle,
} from '@/types/export';
import { renderMarkdownToHtml } from '@/editor/markdown';
import {
    renderExportDocument,
    type RenderedExportSegment,
} from '../exportRender';

// ===== TEXT ADAPTER =====

function renderSegmentsToText(segments: RenderedExportSegment[]): string {
    return segments
        .map((segment) => {
            if (segment.type === 'newline') {
                return '\n';
            }

            if (segment.type === 'tab') {
                return '\t';
            }

            return segment.value;
        })
        .join('');
}

export function textAdapter(rows: ExportRow[], format: ExportFormat): string {
    const rendered = renderExportDocument(rows, format);

    return rendered.blocks
        .map(
            (block) =>
                renderSegmentsToText(block.segments) +
                renderSegmentsToText(block.trailingSegments),
        )
        .join('');
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

function renderSegmentsToHtml(segments: RenderedExportSegment[]): string {
    return segments
        .map((segment) => {
            if (segment.type === 'newline') {
                return '<br/>';
            }

            if (segment.type === 'tab') {
                return '<span>&#9;</span>';
            }

            const escapedValue = escapeHtml(segment.value);
            const css = styleToCss(segment.style);

            return css
                ? `<span style="${css}">${escapedValue}</span>`
                : escapedValue;
        })
        .join('');
}

function renderSegmentsToHtmlWithOptions(
    segments: RenderedExportSegment[],
    options: ExportAdapterOptions,
): string {
    return segments
        .map((segment) => {
            if (segment.type !== 'content' || !options.enableMarkdown) {
                return renderSegmentsToHtml([segment]);
            }

            const css = styleToCss(segment.style);
            const styleAttribute = css ? ` style="${css}"` : '';
            const html = renderMarkdownToHtml(segment.value).trimEnd();
            const inlineMatch = html.match(/^<p>([\s\S]*)<\/p>$/);
            if (inlineMatch) {
                return `<span class="markdown-content"${styleAttribute}>${inlineMatch[1]}</span>`;
            }
            return `<div class="markdown-content"${styleAttribute}>${html}</div>`;
        })
        .join('');
}

function renderHtmlBody(
    rows: ExportRow[],
    format: ExportFormat,
    options: ExportAdapterOptions = {},
): string {
    const rendered = renderExportDocument(rows, format);

    return rendered.blocks
        .map((block) => {
            const htmlContent =
                renderSegmentsToHtmlWithOptions(block.segments, options) +
                renderSegmentsToHtmlWithOptions(
                    block.trailingSegments,
                    options,
                );

            if (block.type === 'documentSeparator') {
                return `<div class="doc"><h3>${htmlContent}</h3></div>`;
            }

            if (block.type === 'chunkSeparator') {
                return `<div class="chunk"><h4>${htmlContent}</h4></div>`;
            }

            return `<div class="msg">${htmlContent}</div>`;
        })
        .join('\n');
}

export function htmlAdapter(
    rows: ExportRow[],
    format: ExportFormat,
    options: ExportAdapterOptions = {},
): string {
    const body = renderHtmlBody(rows, format, options);

    return `<!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <style>
    body{
    white-space:pre-wrap;
    font-family:sans-serif;
    padding:20px}
    .msg{margin-bottom:8px}
    .markdown-content{white-space:normal}
    .markdown-content>:first-child{margin-top:0}
    .markdown-content>:last-child{margin-bottom:0}
    .markdown-content pre,.markdown-content table{overflow-x:auto}
    .markdown-content table{border-collapse:collapse}
    .markdown-content th,.markdown-content td{border:1px solid #ddd;padding:4px 8px}
    .doc{text-align:center}
    </style>
    </head>
    <body>${body}</body>
    </html>`;
}

// ===== DOC ADAPTER (Word 兼容 HTML) =====

export function docAdapter(
    rows: ExportRow[],
    format: ExportFormat,
    options: ExportAdapterOptions = {},
): string {
    const body = renderHtmlBody(rows, format, options);
    // 复用 HTML Adapter，但添加特定的 Word 命名空间
    return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head><body>${body}</body></html>`;
}
