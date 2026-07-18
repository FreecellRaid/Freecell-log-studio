export type MobileSheetName = 'message' | 'projectName' | 'chunkName' | null;

export type MobileOverlay =
    | { kind: 'leftDrawer' }
    | { kind: 'bottomPanel' }
    | { kind: 'sheet'; sheet: Exclude<MobileSheetName, null> }
    | null;
