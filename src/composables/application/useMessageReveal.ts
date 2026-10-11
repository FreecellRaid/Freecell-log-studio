import { nextTick, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';
import type { Message } from '@/types/log';

export function useMessageReveal(options: {
    windowId: MaybeRefOrGetter<string>;
    messages: MaybeRefOrGetter<Message[]>;
    ready: MaybeRefOrGetter<boolean>;
    reveal: (index: number, messageId: string) => boolean | Promise<boolean>;
}) {
    const windowStore = useWindowStore();
    watch(
        () =>
            [
                windowStore.pendingMessageReveal,
                toValue(options.windowId),
                toValue(options.messages).slice(),
                toValue(options.ready),
            ] as const,
        async ([request, windowId, messages, ready], _previous, onCleanup) => {
            if (!request || request.windowId !== windowId || !ready) return;
            const index = messages.findIndex(
                (message) => message.messageId === request.messageId,
            );
            if (index === -1) return;
            let cancelled = false;
            onCleanup(() => {
                cancelled = true;
            });
            await nextTick();
            if (cancelled) return;
            const revealed = await options.reveal(index, request.messageId);
            if (!cancelled && revealed)
                windowStore.clearPendingMessageReveal(request.requestId);
        },
        { flush: 'post', immediate: true },
    );
}
