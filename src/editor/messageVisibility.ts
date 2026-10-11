import type { Message } from '@/types/log';

export function getVisibleMessages(
    messages: Message[],
    settings: { hideOoc: boolean; hideCommand: boolean },
    showHidden: boolean,
) {
    if (showHidden) return messages;
    return messages.filter(
        (message) =>
            !(
                (settings.hideOoc && message.isOoc) ||
                (settings.hideCommand && message.isCommand)
            ),
    );
}
