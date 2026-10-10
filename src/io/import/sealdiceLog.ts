import type { ImportRow } from '@/types/import';
import { cleanContent } from './cleaner';

export const SEALDICE_LOG_FORMAT = 'sealdice-json';

// 海豹导出的 JSON 与 Freecell 工程 JSON 分开解析。
export function parseSealdiceLog(text: string): ImportRow[] | null {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const log = value as Record<string, unknown>;
    if (!Array.isArray(log.items) || typeof log.version !== 'number')
        return null;
    return log.items.map((item, index) => {
        const fail = (field: string): never => {
            throw new Error(`海豹日志第 ${index + 1} 条消息的 ${field} 无效`);
        };
        if (!item || typeof item !== 'object' || Array.isArray(item))
            return fail('结构');
        const message = item as Record<string, unknown>;
        for (const key of ['nickname', 'message', 'IMUserId']) {
            if (typeof message[key] !== 'string') fail(key);
        }
        if (typeof message.isDice !== 'boolean') fail('isDice');
        if (typeof message.time !== 'number' || !Number.isFinite(message.time))
            fail('time');
        const time = new Date((message.time as number) * 1000);
        if (Number.isNaN(time.getTime())) fail('time');
        if (
            message.id !== undefined &&
            typeof message.id !== 'string' &&
            !(
                typeof message.id === 'number' &&
                Number.isSafeInteger(message.id)
            )
        )
            fail('id');
        // 骰子身份由明确标记决定，玩家身份仍可由昵称推断 GM/OB 等。
        const { message: content, nickname, IMUserId, ...metadata } = message;
        return {
            playerName: nickname as string,
            account: IMUserId as string,
            content: cleanContent(
                (content as string).replace(/\r\n|\r/g, '\n'),
            ),
            time,
            role: message.isDice ? 'bot' : undefined,
            originalMessageId:
                message.id === undefined ? undefined : String(message.id),
            meta: { sealdice: { ...metadata, version: log.version } },
        };
    });
}
