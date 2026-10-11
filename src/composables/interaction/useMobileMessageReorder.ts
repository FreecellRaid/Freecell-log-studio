import {
    onScopeDispose,
    ref,
    toValue,
    watch,
    type MaybeRefOrGetter,
} from 'vue';
import type { Chunk, Message } from '@/types/log';
import { useLogCommands } from '@/stores/project/logCommands';

type DropTarget = { messageId: string; position: 'before' | 'after' };

export function useMobileMessageReorder(options: {
    chunk: MaybeRefOrGetter<Chunk>;
    messages: MaybeRefOrGetter<Message[]>;
    container: MaybeRefOrGetter<HTMLElement | null>;
}) {
    const commands = useLogCommands();
    const draggedId = ref<string | null>(null);
    const isDragging = ref(false);
    const dropTarget = ref<DropTarget | null>(null);
    let pointer: {
        id: number;
        startX: number;
        startY: number;
        x: number;
        y: number;
    } | null = null;
    let frame: number | null = null;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressClickUntil = 0;
    let hasMoved = false;

    function updateTarget() {
        const container = toValue(options.container);
        if (!container || !pointer) return;
        const visibleIds = new Set(
            toValue(options.messages).map((message) => message.messageId),
        );
        const rows = Array.from(
            container.querySelectorAll<HTMLElement>('[data-message-id]'),
        ).filter(
            (row) =>
                row.dataset.messageId !== draggedId.value &&
                visibleIds.has(row.dataset.messageId!),
        );
        const source = Array.from(
            container.querySelectorAll<HTMLElement>('[data-message-id]'),
        ).find((row) => row.dataset.messageId === draggedId.value);
        const sourceRect = source?.getBoundingClientRect();
        if (
            sourceRect &&
            pointer.y >= sourceRect.top &&
            pointer.y <= sourceRect.bottom
        ) {
            dropTarget.value = null;
            return;
        }
        const next = rows.find((row) => {
            const rect = row.getBoundingClientRect();
            return pointer!.y < rect.top + rect.height / 2;
        });
        const row = next ?? rows.at(-1);
        dropTarget.value = row
            ? {
                  messageId: row.dataset.messageId!,
                  position: next ? 'before' : 'after',
              }
            : null;
    }

    function autoScroll() {
        frame = null;
        const container = toValue(options.container);
        if (!container || !pointer || !isDragging.value) return;
        const rect = container.getBoundingClientRect();
        if (pointer.x >= rect.left && pointer.x <= rect.right) {
            const edge = Math.min(56, rect.height / 4);
            const speed =
                pointer.y < rect.top + edge
                    ? -Math.min(14, (rect.top + edge - pointer.y) / 4)
                    : pointer.y > rect.bottom - edge
                      ? Math.min(14, (pointer.y - rect.bottom + edge) / 4)
                      : 0;
            if (speed) {
                container.scrollTop += speed;
                updateTarget();
            }
        }
        frame = requestAnimationFrame(autoScroll);
    }

    function cancel() {
        if (isDragging.value) suppressClickUntil = Date.now() + 750;
        pointer = null;
        hasMoved = false;
        draggedId.value = null;
        isDragging.value = false;
        dropTarget.value = null;
        if (holdTimer !== null) clearTimeout(holdTimer);
        holdTimer = null;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
    }

    function onTouchStart(event: TouchEvent, messageId: string) {
        if (event.touches.length !== 1) {
            cancel();
            return;
        }
        const target = event.target;
        if (
            target instanceof Element &&
            target.closest(
                'button, a, input, textarea, select, [contenteditable]',
            )
        )
            return;
        if (toValue(options.messages).length < 2) return;
        cancel();
        const touch = event.touches[0];
        pointer = {
            id: touch.identifier,
            startX: touch.clientX,
            startY: touch.clientY,
            x: touch.clientX,
            y: touch.clientY,
        };
        holdTimer = setTimeout(() => {
            holdTimer = null;
            if (!pointer) return;
            draggedId.value = messageId;
            isDragging.value = true;
        }, 450);
    }

    function onTouchMove(event: TouchEvent) {
        if (!pointer) return;
        if (event.touches.length !== 1) {
            cancel();
            return;
        }
        const touch = Array.from(event.touches).find(
            (touch) => touch.identifier === pointer!.id,
        );
        if (!touch) return;
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        if (!isDragging.value) {
            // 长按成立前滑动，交给浏览器滚动列表。
            if (
                Math.hypot(
                    pointer.x - pointer.startX,
                    pointer.y - pointer.startY,
                ) > 8
            )
                cancel();
            return;
        }
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        hasMoved ||=
            Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) >
            8;
        if (!hasMoved) return;
        updateTarget();
        if (frame === null) frame = requestAnimationFrame(autoScroll);
    }

    function onTouchEnd(event: TouchEvent) {
        if (!pointer) return;
        const touch = Array.from(event.changedTouches).find(
            (touch) => touch.identifier === pointer!.id,
        );
        if (!touch) return;
        const container = toValue(options.container);
        const rect = container?.getBoundingClientRect();
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        if (isDragging.value) {
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
            if (hasMoved) updateTarget();
        }
        const sourceId = draggedId.value;
        const target = dropTarget.value;
        const inside =
            rect &&
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom;
        const chunk = toValue(options.chunk);
        const index = chunk.messages.findIndex(
            (message) => message.messageId === target?.messageId,
        );
        const shouldMove =
            isDragging.value &&
            hasMoved &&
            inside &&
            sourceId &&
            target &&
            index !== -1;
        cancel();
        if (shouldMove)
            commands.moveMessages(
                [sourceId],
                chunk.chunkId,
                chunk.chunkId,
                index + (target.position === 'after' ? 1 : 0),
            );
    }

    function onClick(event: MouseEvent) {
        if (!isDragging.value && Date.now() >= suppressClickUntil) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function onContextMenu(event: Event) {
        if (pointer || isDragging.value) event.preventDefault();
    }

    // 数据、筛选或场景变化后，旧的落点不再有效。
    watch(
        () => [
            toValue(options.chunk).chunkId,
            ...toValue(options.messages).map((message) => message.messageId),
        ],
        cancel,
        { flush: 'sync' },
    );
    onScopeDispose(cancel);
    return {
        draggedId,
        isDragging,
        dropTarget,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onClick,
        onContextMenu,
        cancel,
    };
}
