import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
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

export async function docxAdapter(
    rows: ExportRow[],
    format: ExportFormat,
): Promise<Blob> {
    const paragraphs: Paragraph[] = [];

    // 预解析核心模板
    const msgTokens = parseTemplate(format.messageTemplate);

    for (const row of rows) {
        if (row.type === 'documentSeparator') {
            paragraphs.push(
                new Paragraph({
                    text: format.docSeparator.replace(
                        '{{name}}',
                        row.content || '',
                    ),
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
            );
        } else if (row.type === 'message') {
            let currentRuns: TextRun[] = [];

            // 辅助函数：根据 Token 生成 TextRun 并压入数组
            const processTokens = (tokens: TemplateToken[]) => {
                for (const token of tokens) {
                    switch (token.type) {
                        case 'placeholder':
                            const val = getPlaceholderValue(
                                token.value,
                                row,
                                format,
                            );
                            if (val) {
                                // 根据占位符类型分配样式
                                const style =
                                    token.value === 'content'
                                        ? row.contentStyle
                                        : row.nameStyle;
                                currentRuns.push(
                                    new TextRun({
                                        text: val,
                                        ...applyStyle(style),
                                    }),
                                );
                            }
                            break;
                        case 'text':
                            currentRuns.push(
                                new TextRun({ text: token.value }),
                            );
                            break;
                        case 'newline':
                            // 遇到换行，结束当前段落并开启新段落
                            paragraphs.push(
                                new Paragraph({ children: currentRuns }),
                            );
                            currentRuns = [];
                            break;
                        case 'tab':
                            currentRuns.push(
                                new TextRun({ children: [new Tab()] }),
                            );
                            break;
                    }
                }
            };

            processTokens(msgTokens);

            if (currentRuns.length > 0) {
                paragraphs.push(new Paragraph({ children: currentRuns }));
            }
        }
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    return await Packer.toBlob(doc);
}
