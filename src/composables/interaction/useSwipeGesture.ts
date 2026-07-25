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

interface SwipeGestureState {
    options: SwipeGestureOptions;
    origin: TouchOrigin | null;
}

export function useSwipeGesture(
    options: SwipeGestureOptions | SwipeGestureOptions[],
) {
    const states: SwipeGestureState[] = (
        Array.isArray(options) ? options : [options]
    ).map((gestureOptions) => ({
        options: gestureOptions,
        origin: null,
    }));

    function onTouchStart(event: TouchEvent) {
        for (const state of states) {
            if (
                event.touches.length !== 1 ||
                state.options.canStart?.(event) === false
            ) {
                state.origin = null;
                continue;
            }

            const touch = event.touches[0];
            state.origin = {
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now(),
            };
        }
    }

    function onTouchEnd(event: TouchEvent) {
        for (const state of states) {
            if (!state.origin || event.changedTouches.length !== 1) {
                state.origin = null;
                continue;
            }

            const start = state.origin;
            const touch = event.changedTouches[0];
            state.origin = null;

            if (
                Date.now() - start.timestamp >
                (state.options.maxDuration ?? 700)
            )
                continue;

            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;
            const minDistance = state.options.minDistance ?? 64;
            const axisRatio = state.options.axisRatio ?? 1.25;
            const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * axisRatio;
            const vertical = Math.abs(deltaY) > Math.abs(deltaX) * axisRatio;

            const matched =
                (state.options.direction === 'left' &&
                    horizontal &&
                    deltaX <= -minDistance) ||
                (state.options.direction === 'right' &&
                    horizontal &&
                    deltaX >= minDistance) ||
                (state.options.direction === 'up' &&
                    vertical &&
                    deltaY <= -minDistance) ||
                (state.options.direction === 'down' &&
                    vertical &&
                    deltaY >= minDistance);

            if (matched) state.options.onSwipe();
        }
    }

    function onTouchCancel() {
        for (const state of states) state.origin = null;
    }

    return { onTouchStart, onTouchEnd, onTouchCancel };
}
