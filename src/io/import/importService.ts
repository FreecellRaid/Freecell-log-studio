import type { ImportTextEntry } from '@/types/import';
import type { LogDocument } from '@/types/log';
import { parseSealdiceLog, SEALDICE_LOG_FORMAT } from './sealdiceLog';
import { dispatchAdapter, getImportAdapter } from './importAdapters';
import { buildLogDocument } from './parser';
import { parseStructuredLog, STRUCTURED_LOG_FORMAT } from './structuredLog';

export function preprocessText(text: string): string {
    return text.replace(/\r\n|\r/g, '\n').replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export async function importFiles(
    entries: ImportTextEntry[],
    startIndex = 0,
): Promise<LogDocument[]> {
    const documents: LogDocument[] = [];
    for (const entry of entries) {
        const text = preprocessText(entry.text);
        if (!text.trim()) continue;
        try {
            const structured = parseStructuredLog(text);
            if (entry.format === STRUCTURED_LOG_FORMAT && !structured)
                throw new Error('文件不符合 freecell-log-v1 格式');
            const sealdice = parseSealdiceLog(text);
            if (entry.format === SEALDICE_LOG_FORMAT && !sealdice)
                throw new Error('文件不符合海豹 JSON 日志格式');
            let rows;
            if (
                structured &&
                (!entry.format || entry.format === STRUCTURED_LOG_FORMAT)
            ) {
                rows = structured.rows;
            } else if (
                sealdice &&
                (!entry.format || entry.format === SEALDICE_LOG_FORMAT)
            ) {
                rows = sealdice;
            } else {
                const adapter = entry.format
                    ? getImportAdapter(entry.format)
                    : dispatchAdapter(text);
                // 明确格式时允许一条消息，但仍要求有格式证据。
                if (
                    entry.format &&
                    adapter.test(text.split('\n').slice(0, 100)) <= 0
                )
                    throw new Error('内容与指定日志格式不符');
                rows = adapter.parse(text);
            }
            const doc = buildLogDocument(
                rows,
                structured?.name || entry.name,
                startIndex + documents.length,
            );
            doc.source = entry.source ? { ...entry.source } : undefined;
            if (doc.chunks.length === 0)
                throw new Error('日志中没有可导入的消息');
            documents.push(doc);
        } catch (error) {
            throw new Error(
                `文件 "${entry.name}" 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
            );
        }
    }
    return documents;
}
