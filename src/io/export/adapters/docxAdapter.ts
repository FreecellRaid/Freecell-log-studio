import { imageFallback, type ImageExportSegment } from './imageSources';
import { prepareDocxImage, type DocxImageData } from './docxImages';
import {
    AlignmentType,
    Document,
    Packer,
    Paragraph,
    Tab,
    TextRun,
    ImageRun,
} from 'docx';
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

type DocxRun = TextRun | ImageRun;
type ImageRunResolver = (segment: ImageExportSegment) => Promise<DocxRun>;
async function createParagraphFromSegments(
    segments: RenderedExportSegment[],
    resolveImage: ImageRunResolver,
): Promise<Paragraph> {
    const runs = await createRunsFromSegments(segments, resolveImage);
    return runs.length
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

// 列表、引用、表格转成文本布局，图片和链接目标不保留
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

async function createParagraphsForBlock(
    segments: RenderedExportSegment[],
    options: ExportAdapterOptions,
    resolveImage: ImageRunResolver,
): Promise<Paragraph[]> {
    if (!options.enableMarkdown) {
        return [await createParagraphFromSegments(segments, resolveImage)];
    }

    const contentIndex = segments.findIndex(
        (segment) => segment.type === 'content',
    );
    if (contentIndex < 0) {
        return [await createParagraphFromSegments(segments, resolveImage)];
    }

    const contentSegment = segments[contentIndex];
    if (contentSegment.type !== 'content') {
        return [await createParagraphFromSegments(segments, resolveImage)];
    }

    const markdownRuns = markdownToRuns(
        contentSegment.value,
        contentSegment.style,
    );
    const prefix = await createRunsFromSegments(
        segments.slice(0, contentIndex),
        resolveImage,
    );
    const suffix = await createRunsFromSegments(
        segments.slice(contentIndex + 1),
        resolveImage,
    );

    return [
        new Paragraph({
            children: [...prefix, ...markdownRuns, ...suffix],
            alignment: AlignmentType.LEFT,
        }),
    ];
}

async function createRunsFromSegments(
    segments: RenderedExportSegment[],
    resolveImage: ImageRunResolver,
): Promise<DocxRun[]> {
    const runs: DocxRun[] = [];
    let pendingBreaks = 0;
    const push = (run: DocxRun) => {
        if (pendingBreaks) {
            runs.push(new TextRun({ break: pendingBreaks }));
            pendingBreaks = 0;
        }
        runs.push(run);
    };
    for (const segment of segments) {
        if (segment.type === 'newline') pendingBreaks++;
        else if (segment.type === 'tab')
            push(new TextRun({ children: [new Tab()] }));
        else if (segment.type === 'image') push(await resolveImage(segment));
        else if (segment.value) {
            segment.value.split('\n').forEach((line, index) => {
                if (index) pendingBreaks++;
                if (line)
                    push(
                        new TextRun({
                            text: line,
                            ...applyStyle(segment.style),
                        }),
                    );
            });
        }
    }
    if (pendingBreaks) runs.push(new TextRun({ break: pendingBreaks }));
    return runs;
}

export async function docxAdapter(
    rows: ExportRow[],
    format: ExportFormat,
    options: ExportAdapterOptions = {},
): Promise<Blob> {
    const rendered = renderExportDocument(rows, format, options.resources);
    const images = new Map<string, Promise<DocxImageData | undefined>>();
    const resolveImage: ImageRunResolver = async (segment) => {
        if (!images.has(segment.resourceId))
            images.set(
                segment.resourceId,
                segment.resource?.blob
                    ? prepareDocxImage(segment.resource).catch(() => undefined)
                    : Promise.resolve(undefined),
            );
        const image = await images.get(segment.resourceId);
        if (image)
            return new ImageRun({
                type: image.type,
                data: image.data,
                transformation: { width: image.width, height: image.height },
                altText: {
                    name: segment.imageName || '图片',
                    description: segment.imageName,
                },
            });
        return new TextRun({ text: imageFallback(segment) });
    };
    const paragraphs: Paragraph[] = [];
    for (const block of rendered.blocks)
        paragraphs.push(
            ...(await createParagraphsForBlock(
                [...block.segments, ...block.trailingSegments],
                options,
                resolveImage,
            )),
        );

    const doc = new Document({ sections: [{ children: paragraphs }] });
    return await Packer.toBlob(doc);
}
