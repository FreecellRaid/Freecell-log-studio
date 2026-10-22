import type {
    ExportFormat,
    ExportRow,
    ExportRowType,
    ExportStyle,
    ExportResource,
    ExportResourceContext,
} from '@/types/export';
import {
    DEFAULT_IMAGE_PLACEHOLDER,
    DEFAULT_IMAGE_TEMPLATE,
} from '@/types/export';
import { getPlaceholderValue, parseTemplate } from './templateParser';

export type RenderedExportSegment =
    | {
          type: 'text';
          value: string;
          style?: ExportStyle;
      }
    | {
          type: 'content';
          value: string;
          style?: ExportStyle;
      }
    | {
          type: 'image';
          imageName: string;
          resourceId: string;
          resource?: ExportResource;
          value: string;
          style?: never;
      }
    | {
          type: 'newline';
      }
    | {
          type: 'tab';
      };

export interface RenderedExportBlock {
    type: ExportRowType;
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
    resources?: ExportResourceContext,
): string {
    if (row.type === 'message' || row.type === 'image') {
        return getPlaceholderValue(key, row, format, resources);
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
    resources?: ExportResourceContext,
) {
    if (key === 'image' && row.type === 'image') {
        const resource = resources?.resources.get(row.image.resourceId);
        segments.push({
            type: 'image',
            imageName: row.image.name,
            resourceId: row.image.resourceId,
            resource,
            value: resource?.sourceUrl || DEFAULT_IMAGE_PLACEHOLDER,
        });
        return;
    }
    const value = resolvePlaceholderValue(row, key, format, resources);
    const style =
        row.type === 'message' || row.type === 'image'
            ? getMessageTokenStyle(key, row)
            : undefined;

    if (key === 'content') {
        if (value) {
            segments.push({ type: 'content', value, style });
        }
        return;
    }

    pushTextSegment(segments, value, style);
}

function renderTemplateSegments(
    template: string,
    row: ExportRow,
    format: ExportFormat,
    resources?: ExportResourceContext,
): RenderedExportSegment[] {
    const segments: RenderedExportSegment[] = [];

    for (const token of parseTemplate(template)) {
        if (token.type === 'placeholder') {
            renderPlaceholderSegments(
                segments,
                token.value,
                row,
                format,
                resources,
            );
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
    resources?: ExportResourceContext,
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

        if (row.type === 'message' || row.type === 'image') {
            let segments = renderTemplateSegments(
                row.type === 'image'
                    ? (format.imageTemplate ?? DEFAULT_IMAGE_TEMPLATE)
                    : format.messageTemplate,
                row,
                format,
                resources,
            );
            if (
                row.type === 'image' &&
                !segments.some((segment) => segment.type === 'image') &&
                !renderSegmentsToPlainText(segments).trim()
            )
                segments = [{ type: 'text', value: DEFAULT_IMAGE_PLACEHOLDER }];
            const trailingSegments = renderTemplateSegments(
                format.messageSeparator,
                row,
                format,
                resources,
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
