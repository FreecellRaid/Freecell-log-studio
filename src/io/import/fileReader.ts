import { readFileAsText } from './textDecoder';

const DOCX_MIME_TYPE =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface ImportedFileText {
    text: string;
    source: 'text' | 'docx';
    encoding?: string;
    confidence?: number;
}

export function isDocxFile(file: Pick<File, 'name' | 'type'>): boolean {
    return (
        file.type.toLowerCase() === DOCX_MIME_TYPE || /\.docx$/i.test(file.name)
    );
}

export async function extractDocxText(
    arrayBuffer: ArrayBuffer,
): Promise<string> {
    // 显式使用浏览器构建，确保 ArrayBuffer 输入在浏览器和测试环境中一致。
    const mammoth = await import('mammoth/mammoth.browser');
    const result = await mammoth.extractRawText({ arrayBuffer });

    for (const message of result.messages) {
        console.warn(`DOCX 文本提取: ${message.message}`);
    }

    return result.value;
}

export async function readImportFile(file: File): Promise<ImportedFileText> {
    if (isDocxFile(file)) {
        try {
            return {
                text: await extractDocxText(await file.arrayBuffer()),
                source: 'docx',
            };
        } catch (error) {
            throw new Error(
                `无法提取 DOCX 文本: ${error instanceof Error ? error.message : '文件可能已损坏'}`,
            );
        }
    }

    const decoded = await readFileAsText(file);
    return {
        ...decoded,
        source: 'text',
    };
}
