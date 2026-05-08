import type {
    ExportFormat,
    ExportRow,
    ExportRowType,
    ExportStyle,
} from '@/types/export';
import { getPlaceholderValue, parseTemplate } from './templateParser';

export type RenderedExportSegment =
    | {
          type: 'text';
          value: string;
          style?: ExportStyle;
      }
    | {
          type: 'newline';
      }
    | {
          type: 'tab';
      };

export interface RenderedExportBlock {
    type: Exclude<ExportRowType, 'image'>;
    segments: RenderedExportSegment[];
    trailingSegments: RenderedExportSegment[];
    plainText: string;
    trailingPlainText: string;
}

export interface RenderedExportDocument {
    blocks: RenderedExportBlock[];
}

function getMessageTokenStyle(
    key: string,
    row: ExportRow,
): ExportStyle | undefined {
    if (key === 'name') {
        return row.nameStyle;
    }

    if (key === 'content') {
        return row.contentStyle;
    }

    return undefined;
}

function resolvePlaceholderValue(
    row: ExportRow,
    key: string,
    format: ExportFormat,
): string {
    if (row.type === 'message') {
        return getPlaceholderValue(key, row, format);
    }

    if (key === 'name') {
        return row.content || '';
    }

    return '';
}

function pushTextSegment(
    segments: RenderedExportSegment[],
    value: string,
    style?: ExportStyle,
) {
    if (!value) {
        return;
    }

    if (style) {
        segments.push({ type: 'text', value, style });
        return;
    }

    segments.push({ type: 'text', value });
}

function renderPlaceholderSegments(
    segments: RenderedExportSegment[],
    key: string,
    row: ExportRow,
    format: ExportFormat,
) {
    const value = resolvePlaceholderValue(row, key, format);
    const style =
        row.type === 'message' ? getMessageTokenStyle(key, row) : undefined;

    if (key === 'content') {
        value.split('\n').forEach((segment, index) => {
            if (index > 0) {
                segments.push({ type: 'newline' });
            }

            pushTextSegment(segments, segment, style);
        });
        return;
    }

    pushTextSegment(segments, value, style);
}

function renderTemplateSegments(
    template: string,
    row: ExportRow,
    format: ExportFormat,
): RenderedExportSegment[] {
    const segments: RenderedExportSegment[] = [];

    for (const token of parseTemplate(template)) {
        if (token.type === 'placeholder') {
            renderPlaceholderSegments(segments, token.value, row, format);
            continue;
        }

        if (token.type === 'newline') {
            segments.push({ type: 'newline' });
            continue;
        }

        if (token.type === 'tab') {
            segments.push({ type: 'tab' });
            continue;
        }

        pushTextSegment(segments, token.value);
    }

    return segments;
}

export function renderSegmentsToPlainText(
    segments: RenderedExportSegment[],
): string {
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

export function renderExportDocument(
    rows: ExportRow[],
    format: ExportFormat,
): RenderedExportDocument {
    const blocks: RenderedExportBlock[] = [];

    for (const row of rows) {
        if (row.type === 'documentSeparator') {
            if (!format.docSeparator) {
                continue;
            }

            const segments = renderTemplateSegments(
                format.docSeparator,
                row,
                format,
            );

            blocks.push({
                type: row.type,
                segments,
                trailingSegments: [],
                plainText: renderSegmentsToPlainText(segments),
                trailingPlainText: '',
            });
            continue;
        }

        if (row.type === 'chunkSeparator') {
            if (!format.chunkSeparator) {
                continue;
            }

            const segments = renderTemplateSegments(
                format.chunkSeparator,
                row,
                format,
            );

            blocks.push({
                type: row.type,
                segments,
                trailingSegments: [],
                plainText: renderSegmentsToPlainText(segments),
                trailingPlainText: '',
            });
            continue;
        }

        if (row.type === 'message') {
            const segments = renderTemplateSegments(
                format.messageTemplate,
                row,
                format,
            );
            const trailingSegments = renderTemplateSegments(
                format.messageSeparator,
                row,
                format,
            );

            blocks.push({
                type: row.type,
                segments,
                trailingSegments,
                plainText: renderSegmentsToPlainText(segments),
                trailingPlainText: renderSegmentsToPlainText(trailingSegments),
            });
        }
    }

    return { blocks };
}
