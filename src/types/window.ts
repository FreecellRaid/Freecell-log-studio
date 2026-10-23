export type WindowName =
    | 'chunkList'
    | 'resources'
    | 'search'
    | 'exportFormat'
    | 'coloring'
    | 'inspector'
    | 'chunkView'
    | 'defaultView'
    | 'exportPreview'
    | 'help'
    | 'remoteImport'
    | 'imageInsert'
    | 'replace';

export type WorkspaceViewName = 'chunkView' | 'exportPreview' | 'defaultView';
export type ModalWindowName =
    | 'help'
    | 'remoteImport'
    | 'imageInsert'
    | 'replace';
export type PanelWindowName = Exclude<
    WindowName,
    WorkspaceViewName | ModalWindowName
>;

export type WindowTarget =
    | { kind: 'chunk'; chunkId: string }
    | { kind: 'format'; formatId: string };

// 实例记录业务身份和目标；行为与组件由定义和平台适配提供。
export type WindowInstance = { windowId: string } & (
    | {
          windowName: 'chunkView';
          target: Extract<WindowTarget, { kind: 'chunk' }>;
      }
    | {
          windowName: 'exportPreview';
          target: Extract<WindowTarget, { kind: 'format' }>;
      }
    | {
          windowName: Exclude<WindowName, 'chunkView' | 'exportPreview'>;
          target?: never;
      }
);

export function getWindowTargetId(win: WindowInstance): string {
    if (win.target?.kind === 'chunk') return win.target.chunkId;
    if (win.target?.kind === 'format') return win.target.formatId;
    return win.windowName;
}

export type PaneDirection = 'horizontal' | 'vertical';

export interface WorkspacePane {
    paneIndex: 0 | 1;
    instance: WindowInstance | null;
    isActive: boolean;
}
