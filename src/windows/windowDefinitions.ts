import type { WindowInstance, WindowName } from '@/types/window';

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
