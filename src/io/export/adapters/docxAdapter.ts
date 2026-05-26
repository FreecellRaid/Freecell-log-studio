import { AlignmentType, Document, Packer, Paragraph, Tab, TextRun } from 'docx';
import type { ExportFormat, ExportStyle, ExportRow } from '@/types/export';
import {
    renderExportDocument,
    type RenderedExportSegment,
} from '../exportRender';

// ===== DOCX ADAPTER =====

// 将 CSS 颜色 (#ff0000) 转换为 docx 需要的 hex 字符串（ff0000）
function getDocxColor(color?: string): string | undefined {
    if (!color) return undefined;
    return color.startsWith('#') ? color.replace('#', '') : color;
}

function applyStyle(style?: ExportStyle): Record<string, unknown> {
    if (!style) return {};
    return {
        color: getDocxColor(style.color),
        bold: style.bold,
        italics: style.italic,
    };
}

function createEmptyParagraph() {
    return new Paragraph({ alignment: AlignmentType.LEFT });
}

function createParagraphFromSegments(
    segments: RenderedExportSegment[],
): Paragraph {
    if (segments.length === 0) {
        return createEmptyParagraph();
    }

    const runs: TextRun[] = [];
    let pendingBreaks = 0;

    const pushRun = (run: TextRun) => {
        if (pendingBreaks > 0) {
            runs.push(new TextRun({ break: pendingBreaks }));
            pendingBreaks = 0;
        }

        runs.push(run);
    };

    for (const segment of segments) {
        if (segment.type === 'newline') {
            pendingBreaks += 1;
            continue;
        }

        if (segment.type === 'tab') {
            pushRun(new TextRun({ children: [new Tab()] }));
            continue;
        }

        if (!segment.value) {
            continue;
        }

        pushRun(
            new TextRun({
                text: segment.value,
                ...applyStyle(segment.style),
            }),
        );
    }

    if (pendingBreaks > 0) {
        runs.push(new TextRun({ break: pendingBreaks }));
    }

    return runs.length > 0
        ? new Paragraph({ children: runs, alignment: AlignmentType.LEFT })
        : createEmptyParagraph();
}

export async function docxAdapter(
    rows: ExportRow[],
    format: ExportFormat,
): Promise<Blob> {
    const rendered = renderExportDocument(rows, format);
    const paragraphs = rendered.blocks.map((block) =>
        createParagraphFromSegments([
            ...block.segments,
            ...block.trailingSegments,
        ]),
    );

    const doc = new Document({ sections: [{ children: paragraphs }] });
    return await Packer.toBlob(doc);
}
