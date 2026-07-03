import { PANEL_MAX_WIDTH, PANEL_MIN_WIDTH } from '@/stores/uiStore';

type ResizeEdge = 'left' | 'right';

interface UsePanelResizeOptions {
    edge: ResizeEdge;
    getWidth: () => number;
    setWidth: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
}

function clampWidth(width: number, minWidth: number, maxWidth: number) {
    return Math.min(maxWidth, Math.max(minWidth, width));
}

export function usePanelResize(options: UsePanelResizeOptions) {
    function startResize(e: MouseEvent) {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = options.getWidth();
        const direction = options.edge === 'right' ? 1 : -1;
        const minWidth = options.minWidth ?? PANEL_MIN_WIDTH;
        const maxWidth = options.maxWidth ?? PANEL_MAX_WIDTH;

        function onMouseMove(ev: MouseEvent) {
            const delta = ev.clientX - startX;
            options.setWidth(
                clampWidth(startWidth + delta * direction, minWidth, maxWidth),
            );
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    return {
        startResize,
    };
}
