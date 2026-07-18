export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeGestureOptions {
    direction: SwipeDirection;
    onSwipe: () => void;
    canStart?: (event: TouchEvent) => boolean;
    minDistance?: number;
    maxDuration?: number;
    axisRatio?: number;
}

interface TouchOrigin {
    x: number;
    y: number;
    timestamp: number;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
    let origin: TouchOrigin | null = null;

    function onTouchStart(event: TouchEvent) {
        if (event.touches.length !== 1 || options.canStart?.(event) === false) {
            origin = null;
            return;
        }

        const touch = event.touches[0];
        origin = {
            x: touch.clientX,
            y: touch.clientY,
            timestamp: Date.now(),
        };
    }

    function onTouchEnd(event: TouchEvent) {
        if (!origin || event.changedTouches.length !== 1) {
            origin = null;
            return;
        }

        const start = origin;
        const touch = event.changedTouches[0];
        origin = null;

        if (Date.now() - start.timestamp > (options.maxDuration ?? 700)) return;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const minDistance = options.minDistance ?? 64;
        const axisRatio = options.axisRatio ?? 1.25;
        const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * axisRatio;
        const vertical = Math.abs(deltaY) > Math.abs(deltaX) * axisRatio;

        const matched =
            (options.direction === 'left' &&
                horizontal &&
                deltaX <= -minDistance) ||
            (options.direction === 'right' &&
                horizontal &&
                deltaX >= minDistance) ||
            (options.direction === 'up' &&
                vertical &&
                deltaY <= -minDistance) ||
            (options.direction === 'down' && vertical && deltaY >= minDistance);

        if (matched) options.onSwipe();
    }

    function onTouchCancel() {
        origin = null;
    }

    return { onTouchStart, onTouchEnd, onTouchCancel };
}
