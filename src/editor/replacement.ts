import type { Message } from '@/types/log';

export interface ReplacementOptions {
    field: 'content' | 'note';
    mode: 'text' | 'whole';
    find: string;
    replacement: string;
}

export interface ReplacementChange {
    messageId: string;
    before: string;
    after: string;
    occurrences: number;
}

// 普通文字按字面量、区分大小写匹配；保留空格、换行和 $ 等字符。
export function planReplacement(
    messages: Message[],
    options: ReplacementOptions,
): ReplacementChange[] {
    if (options.mode === 'text' && !options.find) return [];
    return messages.flatMap((message) => {
        const before = message[options.field] ?? '';
        const parts = options.mode === 'text' ? before.split(options.find) : [];
        const after =
            options.mode === 'whole'
                ? options.replacement
                : parts.join(options.replacement);
        return before === after
            ? []
            : [
                  {
                      messageId: message.messageId,
                      before,
                      after,
                      occurrences:
                          options.mode === 'whole' ? 1 : parts.length - 1,
                  },
              ];
    });
}
