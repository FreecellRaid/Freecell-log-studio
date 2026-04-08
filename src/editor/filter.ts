import type { Message, MessageFilter } from '@/types/log';

export function matchesMessageFilter(
    message: Message,
    filter: MessageFilter,
): boolean {
    if (!filter) return true;

    for (const [key, expectedValue] of Object.entries(filter)) {
        if (expectedValue === undefined || expectedValue === null) continue;

        const messageValue = message[key as keyof Message];
        if (messageValue === undefined || messageValue === null) return false;

        switch (key) {
            // 字符串字段：包含匹配
            case 'playerName':
            case 'account':
            case 'content':
            case 'note':
            case 'messageId':
            case 'chunkId':
                if (expectedValue instanceof RegExp) {
                    if (!expectedValue.test(String(messageValue))) return false;
                } else if (Array.isArray(expectedValue)) {
                    // 数组OR逻辑，只要包含其中一个关键词
                    let matchedAny = false;
                    for (let j = 0; j < expectedValue.length; j++) {
                        if (
                            String(messageValue).includes(
                                String(expectedValue[j]),
                            )
                        ) {
                            matchedAny = true;
                            break;
                        }
                    }
                    if (!matchedAny) return false;
                } else {
                    if (!String(messageValue).includes(String(expectedValue)))
                        return false;
                }
                break;

            case 'messageIndex':
                if (Array.isArray(expectedValue)) {
                    if ((expectedValue as any[]).indexOf(messageValue) === -1)
                        return false;
                } else {
                    if (messageValue !== expectedValue) return false;
                }
                break;

            case 'isOoc':
            case 'isCommand':
            case 'role':
                if (messageValue !== expectedValue) return false;
                break;

            // 日期字段：可以精确匹配或按日期比较
            case 'time':
                if (
                    messageValue instanceof Date &&
                    expectedValue instanceof Date
                ) {
                    if (messageValue.getTime() !== expectedValue.getTime())
                        return false;
                } else {
                    if (messageValue !== expectedValue) return false;
                }
                break;

            default:
                if (messageValue !== expectedValue) return false;
        }
    }

    return true;
}
