export type PanePosition = 'left' | 'right' | 'center';

export type SplitDirection = 'horizontal' | 'vertical';

export type SplitMode = 'single' | 'double';

export interface SplitPaneState {
    viewType: 'chunkView' | 'exportPreview' | 'defaultView';
    viewId: string; // 原始 ID
    windowId: string; // 生成的唯一窗口 ID，用于打开两个相同view
}

export interface SplitState {
    mode: SplitMode;
    direction: SplitDirection;
    panes: [SplitPaneState, SplitPaneState | null];
    sizes: [number, number];
}

export function generateSplitWindowId(
    pane: PanePosition,
    baseId: string,
): string {
    return `split:${pane}:${baseId}`;
}

export function parseSplitWindowId(windowId: string): {
    pane: PanePosition;
    baseId: string;
} | null {
    const match = windowId.match(/^split:(left|right|center):(.+)$/);
    if (!match) return null;
    return {
        pane: match[1] as PanePosition,
        baseId: match[2],
    };
}
