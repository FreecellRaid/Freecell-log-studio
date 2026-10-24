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

export interface ReplacementPreviewSegment {
    text: string;
    changed: boolean;
}

export function buildReplacementPreview(
    before: string,
    options: ReplacementOptions,
): { before: ReplacementPreviewSegment[]; after: ReplacementPreviewSegment[] } {
    if (options.mode === 'whole' || !options.find) {
        return {
            before: [{ text: before, changed: false }],
            after: [
                {
                    text:
                        options.mode === 'whole' ? options.replacement : before,
                    changed: false,
                },
            ],
        };
    }
    const original: ReplacementPreviewSegment[] = [];
    const replaced: ReplacementPreviewSegment[] = [];
    before.split(options.find).forEach((text, index) => {
        if (index > 0) {
            original.push({ text: options.find, changed: true });
            replaced.push({ text: options.replacement, changed: true });
        }
        if (text) {
            original.push({ text, changed: false });
            replaced.push({ text, changed: false });
        }
    });
    return { before: original, after: replaced };
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
