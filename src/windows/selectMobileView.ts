import type { WindowInstance, WorkspaceViewName } from '@/types/window';

// 平台呈现规则：所有已打开预览优先，然后场景，最后默认页。
// 同类窗口优先采用最近聚焦实例；无焦点记录时采用最近注册实例。
export function selectMobileView(
    openWindows: ReadonlyMap<string, WindowInstance>,
    focusStack: readonly string[],
): WindowInstance | null {
    const windows = [...openWindows.values()];
    for (const name of [
        'exportPreview',
        'chunkView',
        'defaultView',
    ] satisfies WorkspaceViewName[]) {
        for (let i = focusStack.length - 1; i >= 0; i--) {
            const win = openWindows.get(focusStack[i]);
            if (win?.windowName === name) return win;
        }
        for (let i = windows.length - 1; i >= 0; i--) {
            if (windows[i].windowName === name) return windows[i];
        }
    }
    return null;
}
