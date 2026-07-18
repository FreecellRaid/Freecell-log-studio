export type MobileBottomPanelName =
    | 'chunkList'
    | 'identity'
    | 'ruleEditor'
    | 'search'
    | 'exportFormat';

export type MobileSheetName =
    | 'message'
    | 'projectName'
    | 'chunkName'
    | 'storedProjects'
    | null;

export type MobileOverlay =
    | { kind: 'leftDrawer' }
    | { kind: 'bottomPanel' }
    | { kind: 'sheet'; sheet: Exclude<MobileSheetName, null> }
    | null;
