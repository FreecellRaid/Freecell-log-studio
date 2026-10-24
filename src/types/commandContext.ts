import type { PanelWindowName, WindowInstance } from './window';

// 命令目标只保存标识，不复制窗口布局、业务数据或选区。
export type CommandContext =
    | { area: 'scene'; windowId: string; chunkId: string }
    | { area: 'preview'; windowId: string; formatId: string }
    | { area: 'empty'; windowId: string }
    | { area: 'panel'; panel: PanelWindowName };

export function commandContextOwner(context: CommandContext): string {
    return context.area === 'panel' ? context.panel : context.windowId;
}

// 第一阶段的兼容桥：程序打开、关闭窗口时显式更新命令目标。
// 命令执行本身不再查询窗口注册表或遍历焦点历史。
export function commandContextFromWindow(
    win: WindowInstance,
): CommandContext | null {
    switch (win.windowName) {
        case 'chunkView':
            return {
                area: 'scene',
                windowId: win.windowId,
                chunkId: win.target.chunkId,
            };
        case 'exportPreview':
            return {
                area: 'preview',
                windowId: win.windowId,
                formatId: win.target.formatId,
            };
        case 'defaultView':
            return { area: 'empty', windowId: win.windowId };
        case 'help':
        case 'remoteImport':
        case 'imageInsert':
        case 'replace':
            return null;
        default:
            return { area: 'panel', panel: win.windowName };
    }
}
