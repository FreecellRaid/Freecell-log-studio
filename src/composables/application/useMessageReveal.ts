import { nextTick, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';
import type { Message } from '@/types/log';

export function useMessageReveal(options: {
    paneId: MaybeRefOrGetter<string>;
    messages: MaybeRefOrGetter<Message[]>;
    ready: MaybeRefOrGetter<boolean>;
    reveal: (index: number, messageId: string) => boolean | Promise<boolean>;
}) {
    const revealStore = useMessageRevealStore();
    watch(
        () =>
            [
                revealStore.pending,
                toValue(options.paneId),
                toValue(options.messages).slice(),
                toValue(options.ready),
            ] as const,
        async ([request, paneId, messages, ready], _previous, onCleanup) => {
            if (!request || request.paneId !== paneId || !ready) return;
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
            if (!cancelled && revealed) revealStore.clear(request.requestId);
        },
        { flush: 'post', immediate: true },
    );
}
