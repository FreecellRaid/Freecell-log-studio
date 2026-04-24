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

// 这里的命名存在一些历史遗留问题……
// 命名为window而不是view是因为view的语义已经被定义成了'在MainWorkSpace打开的标签页'
export interface WindowInstance {
    windowId: string;
    originalId: string;
    // 真实的业务id，如chunkId/formatId
    windowName: WindowName;
    // 实际上应该是组件类型(ComponentType)，决定渲染哪个 Vue 组件
    windowType: WindowType;
    // 实际上是窗口的行为策略(behaviorMode),决定窗口的物理属性（是否可分屏、如何响应焦点、如何注销）
}

export type SplitDirection = 'horizontal' | 'vertical';
export type SplitMode = 'single' | 'double';

export interface WorkspacePane {
    paneIndex: 0 | 1;
    instance: WindowInstance | null;
    isActive: boolean;
}
