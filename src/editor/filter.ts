import type { Message, MessageFilter, RoleType } from '@/types/log';

export function matchesMessageFilter(
    message: Message,
    filter: MessageFilter,
): boolean {
    if (!filter) return true;

    for (const [key, expectedValue] of Object.entries(filter)) {
        if (expectedValue === undefined || expectedValue === null) continue;

        // timeStart/timeEnd 是范围过滤条件而非消息字段，对应的消息字段是 time
        const messageKey =
            key === 'timeStart' || key === 'timeEnd' ? 'time' : key;
        const messageValue = message[messageKey as keyof Message];
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
                if (messageValue !== expectedValue) return false;
                break;

            case 'role':
                if (Array.isArray(expectedValue)) {
                    if (
                        (expectedValue as RoleType[]).indexOf(
                            messageValue as RoleType,
                        ) === -1
                    )
                        return false;
                } else if (messageValue !== expectedValue) return false;
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

            case 'timeStart':
            case 'timeEnd': {
                if (
                    !(messageValue instanceof Date) ||
                    !(expectedValue instanceof Date)
                ) {
                    return false;
                }
                const messageTime = messageValue.getTime();
                const expectedTime = expectedValue.getTime();
                // Invalid Date（NaN）不参与比较，视为条件无效
                if (Number.isNaN(expectedTime)) break;
                if (key === 'timeStart' && messageTime < expectedTime)
                    return false;
                if (key === 'timeEnd' && messageTime > expectedTime)
                    return false;
                break;
            }

            default:
                if (messageValue !== expectedValue) return false;
        }
    }

    return true;
}
