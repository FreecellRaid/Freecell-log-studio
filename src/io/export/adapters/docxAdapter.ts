import { AlignmentType, Document, Packer, Paragraph, Tab, TextRun } from 'docx';
import type {
    ExportAdapterOptions,
    ExportFormat,
    ExportStyle,
    ExportRow,
} from '@/types/export';
import { parseMarkdown, type MarkdownToken } from '@/editor/markdown';
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

        const lines = segment.value.split('\n');
        lines.forEach((line, index) => {
            if (index > 0) pendingBreaks += 1;
            if (line) {
                pushRun(
                    new TextRun({
                        text: line,
                        ...applyStyle(segment.style),
                    }),
                );
            }
        });
    }

    if (pendingBreaks > 0) {
        runs.push(new TextRun({ break: pendingBreaks }));
    }

    return runs.length > 0
        ? new Paragraph({ children: runs, alignment: AlignmentType.LEFT })
        : createEmptyParagraph();
}

function createInlineRuns(
    token: MarkdownToken,
    baseStyle?: ExportStyle,
): TextRun[] {
    const runs: TextRun[] = [];
    let boldDepth = 0;
    let italicDepth = 0;
    let strikeDepth = 0;

    for (const child of token.children ?? []) {
        if (child.type === 'strong_open') boldDepth += 1;
        else if (child.type === 'strong_close') boldDepth -= 1;
        else if (child.type === 'em_open') italicDepth += 1;
        else if (child.type === 'em_close') italicDepth -= 1;
        else if (child.type === 's_open') strikeDepth += 1;
        else if (child.type === 's_close') strikeDepth -= 1;
        else if (child.type === 'softbreak' || child.type === 'hardbreak') {
            runs.push(new TextRun({ break: 1 }));
        } else if (child.type === 'text' || child.type === 'code_inline') {
            runs.push(
                new TextRun({
                    text: child.content,
                    ...applyStyle(baseStyle),
                    bold: baseStyle?.bold || boldDepth > 0,
                    italics: baseStyle?.italic || italicDepth > 0,
                    strike: strikeDepth > 0,
                    ...(child.type === 'code_inline'
                        ? { font: 'Consolas' }
                        : {}),
                }),
            );
        }
    }

    return runs;
}

function markdownToRuns(content: string, baseStyle?: ExportStyle): TextRun[] {
    const tokens = parseMarkdown(content);
    const blocks: TextRun[][] = [];
    const listStack: Array<'bullet' | 'ordered'> = [];
    let listItemIndex = 0;
    let quoteDepth = 0;
    let tableRow: TextRun[] | null = null;
    let tableCellCount = 0;

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        // Markdown 的块级结构先分别收集，最后统一转成同一 DOCX 段落内的软换行。
        if (token.type === 'bullet_list_open') listStack.push('bullet');
        else if (token.type === 'ordered_list_open') {
            listStack.push('ordered');
            listItemIndex = Number(token.attrGet('start') ?? 1) - 1;
        } else if (
            token.type === 'bullet_list_close' ||
            token.type === 'ordered_list_close'
        ) {
            listStack.pop();
        } else if (token.type === 'list_item_open') {
            listItemIndex += 1;
        } else if (token.type === 'blockquote_open') quoteDepth += 1;
        else if (token.type === 'blockquote_close') quoteDepth -= 1;
        else if (token.type === 'tr_open') {
            tableRow = [];
            tableCellCount = 0;
        } else if (token.type === 'tr_close' && tableRow) {
            blocks.push(tableRow);
            tableRow = null;
        } else if (token.type === 'inline') {
            const inlineRuns = createInlineRuns(token, baseStyle);
            if (tableRow) {
                if (tableCellCount > 0) {
                    tableRow.push(new TextRun({ children: [new Tab()] }));
                }
                tableRow.push(...inlineRuns);
                tableCellCount += 1;
                continue;
            }

            const prefix: TextRun[] = [];
            if (quoteDepth > 0) {
                prefix.push(
                    new TextRun({ text: `${'> '.repeat(quoteDepth)}` }),
                );
            }
            const listType = listStack.at(-1);
            if (listType) {
                prefix.push(
                    new TextRun({
                        text:
                            listType === 'bullet' ? '• ' : `${listItemIndex}. `,
                    }),
                );
            }

            blocks.push([...prefix, ...inlineRuns]);
        } else if (token.type === 'fence' || token.type === 'code_block') {
            const codeRuns: TextRun[] = [];
            token.content
                .replace(/\n$/, '')
                .split('\n')
                .forEach((line, i) => {
                    if (i > 0) codeRuns.push(new TextRun({ break: 1 }));
                    codeRuns.push(
                        new TextRun({ text: line, font: 'Consolas' }),
                    );
                });
            blocks.push(codeRuns);
        }
    }

    return blocks.flatMap((runs, index) =>
        index === 0 ? runs : [new TextRun({ break: 1 }), ...runs],
    );
}

function createParagraphsForBlock(
    segments: RenderedExportSegment[],
    options: ExportAdapterOptions,
): Paragraph[] {
    if (!options.enableMarkdown) {
        return [createParagraphFromSegments(segments)];
    }

    const contentIndex = segments.findIndex(
        (segment) => segment.type === 'content',
    );
    if (contentIndex < 0) {
        return [createParagraphFromSegments(segments)];
    }

    const contentSegment = segments[contentIndex];
    if (contentSegment.type !== 'content') {
        return [createParagraphFromSegments(segments)];
    }

    const markdownRuns = markdownToRuns(
        contentSegment.value,
        contentSegment.style,
    );
    const prefix = createRunsFromSegments(segments.slice(0, contentIndex));
    const suffix = createRunsFromSegments(segments.slice(contentIndex + 1));

    return [
        new Paragraph({
            children: [...prefix, ...markdownRuns, ...suffix],
            alignment: AlignmentType.LEFT,
        }),
    ];
}

function createRunsFromSegments(segments: RenderedExportSegment[]): TextRun[] {
    const runs: TextRun[] = [];
    for (const segment of segments) {
        if (segment.type === 'newline') {
            runs.push(new TextRun({ break: 1 }));
        } else if (segment.type === 'tab') {
            runs.push(new TextRun({ children: [new Tab()] }));
        } else if (segment.value) {
            runs.push(
                new TextRun({
                    text: segment.value,
                    ...applyStyle(segment.style),
                }),
            );
        }
    }
    return runs;
}

export async function docxAdapter(
    rows: ExportRow[],
    format: ExportFormat,
    options: ExportAdapterOptions = {},
): Promise<Blob> {
    const rendered = renderExportDocument(rows, format);
    const paragraphs = rendered.blocks.flatMap((block) =>
        createParagraphsForBlock(
            [...block.segments, ...block.trailingSegments],
            options,
        ),
    );

    const doc = new Document({ sections: [{ children: paragraphs }] });
    return await Packer.toBlob(doc);
}
