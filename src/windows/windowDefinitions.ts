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

export const windowDefinitions: Readonly<
    Record<WindowName, Readonly<WindowDefinition>>
> = {
    chunkList: panel,
    identity: panel,
    search: panel,
    exportFormat: panel,
    ruleEditor: panel,
    inspector: panel,
    chunkView: view,
    exportPreview: { ...view, participatesInSelection: false },
    defaultView: {
        ...view,
        singleton: true,
        allowSplit: false,
        participatesInSelection: false,
    },
    help: {
        group: 'modal',
        singleton: true,
        allowSplit: false,
        participatesInSelection: false,
        blocksCommands: true,
    },
};

export function isWorkspaceView(win: WindowInstance): boolean {
    return windowDefinitions[win.windowName].group === 'view';
}
