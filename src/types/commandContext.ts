import type { LeftPanel, WorkspacePane } from './editorLayout';
import type { SelectionScope } from './selection';

export type CommandContext =
    | { area: 'scene'; paneId: string; chunkId: string }
    | { area: 'preview'; paneId: string; formatId: string }
    | { area: 'empty'; paneId: string }
    | { area: 'panel'; panel: LeftPanel | 'inspector' };

export function commandContextOwner(context: CommandContext): string {
    return context.area === 'panel' ? context.panel : context.paneId;
}
export function commandContextForPane(pane: WorkspacePane): CommandContext {
    const { paneId, view } = pane;
    switch (view.kind) {
        case 'scene':
            return { area: 'scene', paneId, chunkId: view.chunkId };
        case 'preview':
            return { area: 'preview', paneId, formatId: view.formatId };
        default:
            return { area: 'empty', paneId };
    }
}
export function selectionScopeForCommand(
    context: CommandContext,
): SelectionScope | null {
    if (context.area === 'scene')
        return { kind: 'scene', chunkId: context.chunkId };
    if (
        context.area === 'panel' &&
        ['search', 'chunkList', 'resources'].includes(context.panel)
    )
        return { kind: context.panel as 'search' | 'chunkList' | 'resources' };
    return null;
}

export function sameCommandContext(
    a: CommandContext,
    b: CommandContext,
): boolean {
    if (a.area !== b.area) return false;
    if (a.area === 'panel') return b.area === 'panel' && a.panel === b.panel;
    if (b.area === 'panel' || a.paneId !== b.paneId) return false;
    if (a.area === 'scene')
        return b.area === 'scene' && a.chunkId === b.chunkId;
    if (a.area === 'preview')
        return b.area === 'preview' && a.formatId === b.formatId;
    return b.area === 'empty';
}
