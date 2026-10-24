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

// 实例记录业务身份和目标；行为由窗口定义提供，渲染由 WorkspaceView 负责。
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

export interface WindowDefinition {
    group: 'panel' | 'view' | 'modal';
    singleton: boolean;
    allowSplit: boolean;
    participatesInSelection: boolean;
    blocksCommands: boolean;
}

const panel: WindowDefinition = {
    group: 'panel',
    singleton: true,
    allowSplit: false,
    participatesInSelection: true,
    blocksCommands: false,
};
const view: WindowDefinition = {
    group: 'view',
    singleton: false,
    allowSplit: true,
    participatesInSelection: true,
    blocksCommands: false,
};

const modal: WindowDefinition = {
    group: 'modal',
    singleton: true,
    allowSplit: false,
    participatesInSelection: false,
    blocksCommands: true,
};

export const windowDefinitions: Readonly<
    Record<WindowName, Readonly<WindowDefinition>>
> = {
    chunkList: panel,
    search: panel,
    resources: { ...panel, participatesInSelection: false },
    exportFormat: panel,
    coloring: panel,
    inspector: panel,
    chunkView: view,
    exportPreview: { ...view, participatesInSelection: false },
    defaultView: {
        ...view,
        singleton: true,
        allowSplit: false,
        participatesInSelection: false,
    },
    help: modal,
    remoteImport: modal,
    imageInsert: modal,
    replace: modal,
};

export function isWorkspaceView(win: WindowInstance): boolean {
    return windowDefinitions[win.windowName].group === 'view';
}
