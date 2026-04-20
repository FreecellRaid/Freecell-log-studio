export type WindowName =
    | 'chunkList'
    | 'identity'
    | 'search'
    | 'exportFormat'
    | 'ruleEditor'
    | 'inspector'
    | 'chunkView'
    | 'defaultView'
    | 'exportPreview'
    | 'help';

export type WindowType = 'panel' | 'view' | 'modal';

export interface WindowInstance {
    windowId: string; // uuid
    originalId: string; // 业务id
    windowName: WindowName;
    windowType: WindowType;
}

export type SplitDirection = 'horizontal' | 'vertical';
export type SplitMode = 'single' | 'double';

export interface SplitState {
    mode: SplitMode;
    direction: SplitDirection;
    panes: [WindowInstance, WindowInstance | null];
    sizes: [number, number];
}
