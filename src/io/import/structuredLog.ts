import { isRoleType } from '@/types/log';
import type { ImportRow } from '@/types/import';

export const STRUCTURED_LOG_FORMAT = 'freecell-log-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 日志交换协议独立于包含编辑状态的工程 JSON。
export function parseStructuredLog(
    text: string,
): { name?: string; rows: ImportRow[] } | null {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return null;
    }
    if (!isRecord(value) || value.schema !== 'freecell-log') return null;
    if (value.version !== 1) throw new Error('不支持的 freecell-log 协议版本');
    if (!Array.isArray(value.messages))
        throw new Error('结构化日志缺少 messages 数组');
    if (value.name !== undefined && typeof value.name !== 'string')
        throw new Error('日志名称必须是字符串');
    const rows = value.messages.map((message, index): ImportRow => {
        const fail = (field: string): never => {
            throw new Error(`第 ${index + 1} 条消息的 ${field} 无效`);
        };
        if (!isRecord(message)) return fail('结构');
        if (typeof message.content !== 'string') return fail('content');
        for (const key of ['id', 'playerName', 'account', 'note']) {
            if (message[key] !== undefined && typeof message[key] !== 'string')
                fail(key);
        }
        for (const key of ['isOoc', 'isCommand']) {
            if (message[key] !== undefined && typeof message[key] !== 'boolean')
                fail(key);
        }
        if (message.role !== undefined && !isRoleType(message.role))
            fail('role');
        if (message.meta !== undefined && !isRecord(message.meta)) fail('meta');
        let time: Date | undefined;
        if (message.time !== undefined) {
            if (
                typeof message.time !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
                    message.time,
                )
            )
                fail('time（需带时区的 ISO 时间）');
            time = new Date(message.time as string);
            if (Number.isNaN(time.getTime())) fail('time');
        }
        return {
            content: message.content,
            originalMessageId: message.id as string | undefined,
            playerName: message.playerName as string | undefined,
            account: message.account as string | undefined,
            note: message.note as string | undefined,
            role: isRoleType(message.role) ? message.role : undefined,
            isOoc: message.isOoc as boolean | undefined,
            isCommand: message.isCommand as boolean | undefined,
            meta: message.meta as Record<string, unknown> | undefined,
            time,
        };
    });
    return { name: value.name as string | undefined, rows };
}
