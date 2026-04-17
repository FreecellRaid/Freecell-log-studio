import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Tab,
} from 'docx';
import { parseTemplate, getPlaceholderValue } from '../templateParser';
import type { TemplateToken } from '../templateParser';
import type { ExportRow, ExportFormat, ExportStyle } from '@/types/export';

// ===== DOCX ADAPTER =====

// 将 CSS 颜色 (#ff0000) 转换为 docx 需要的 hex 字符串（ff0000）
function getDocxColor(color?: string): string | undefined {
    if (!color) return undefined;
    return color.startsWith('#') ? color.replace('#', '') : color;
}

// 处理样式配置到 TextRun 参数
function applyStyle(style?: ExportStyle): any {
    if (!style) return {};
    return {
        color: getDocxColor(style.color),
        bold: style.bold,
        italics: style.italic,
    };
}

function createEmptyParagraph() {
    return new Paragraph({});
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

function createRunsFromTokens(
    tokens: TemplateToken[],
    resolveToken: (token: TemplateToken) => {
        text: string;
        style?: ExportStyle;
    },
): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let currentRuns: TextRun[] = [];

    const pushParagraph = () => {
        paragraphs.push(
            currentRuns.length > 0
                ? new Paragraph({ children: currentRuns })
                : createEmptyParagraph(),
        );
        currentRuns = [];
    };

    for (const token of tokens) {
        if (token.type === 'newline') {
            pushParagraph();
            continue;
        }

        if (token.type === 'tab') {
            currentRuns.push(new TextRun({ children: [new Tab()] }));
            continue;
        }

        const { text, style } = resolveToken(token);
        if (!text) {
            continue;
        }

        currentRuns.push(
            new TextRun({
                text,
                ...applyStyle(style),
            }),
        );
    }

    if (currentRuns.length > 0 || paragraphs.length === 0) {
        pushParagraph();
    }

    return paragraphs;
}

function createSeparatorParagraphs(template: string, rowContent: string) {
    const tokens = parseTemplate(template);

    return createRunsFromTokens(tokens, (token) => {
        if (token.type === 'placeholder') {
            return {
                text: token.value === 'name' ? rowContent : '',
            };
        }

        return {
            text: token.value,
        };
    });
}

function createMessageParagraphs(row: ExportRow, format: ExportFormat) {
    const tokens = parseTemplate(format.messageTemplate);

    return createRunsFromTokens(tokens, (token) => {
        if (token.type === 'placeholder') {
            return {
                text: getPlaceholderValue(token.value, row, format),
                style: getMessageTokenStyle(token.value, row),
            };
        }

        return {
            text: token.value,
        };
    });
}

export async function docxAdapter(
    rows: ExportRow[],
    format: ExportFormat,
): Promise<Blob> {
    const paragraphs: Paragraph[] = [];

    for (const row of rows) {
        if (row.type === 'documentSeparator') {
            if (format.docSeparator) {
                paragraphs.push(
                    ...createSeparatorParagraphs(
                        format.docSeparator,
                        row.content || '',
                    ),
                );
            }
            continue;
        }

        if (row.type === 'chunkSeparator') {
            if (format.chunkSeparator) {
                paragraphs.push(
                    ...createSeparatorParagraphs(
                        format.chunkSeparator,
                        row.content || '',
                    ),
                );
            }
            continue;
        }

        if (row.type === 'message') {
            paragraphs.push(...createMessageParagraphs(row, format));

            if (format.messageSeparator) {
                paragraphs.push(
                    ...createSeparatorParagraphs(format.messageSeparator, ''),
                );
            }
        }
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    return await Packer.toBlob(doc);
}
