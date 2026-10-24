export type LeftPanel =
    | 'chunkList'
    | 'search'
    | 'resources'
    | 'exportFormat'
    | 'coloring';
export type DialogName = 'help' | 'remoteImport' | 'imageInsert' | 'replace';
export type WorkspaceView =
    | { kind: 'empty' }
    | { kind: 'scene'; chunkId: string }
    | { kind: 'preview'; formatId: string };
export interface WorkspacePane {
    paneId: string;
    view: WorkspaceView;
}
export type PaneDirection = 'horizontal' | 'vertical';
