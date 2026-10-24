import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';

beforeEach(() => setActivePinia(createPinia()));

function split() {
    const navigation = useEditorNavigation();
    const workspace = useWorkspaceStore();
    navigation.showScene('left');
    const left = workspace.activePaneId;
    navigation.splitPane({ kind: 'scene', chunkId: 'right' });
    return { navigation, workspace, left, right: workspace.activePaneId };
}

describe('editor navigation', () => {
    it('keeps layout and command ownership separate when panels take focus', () => {
        const { navigation, workspace, left, right } = split();
        navigation.openPanel('search');
        expect(workspace.activePaneId).toBe(right);
        expect(useCommandContextStore().current).toEqual({
            area: 'panel',
            panel: 'search',
        });
        navigation.showScene('new');
        expect(workspace.panes[0].paneId).toBe(left);
        expect(workspace.panes[1].view).toEqual({
            kind: 'scene',
            chunkId: 'new',
        });
        expect(workspace.activePaneId).toBe(right);
    });

    it('preserves scene selections across replacement and closing all views', () => {
        const { navigation, workspace, left, right } = split();
        const selection = useSelectionStore();
        selection.select({ kind: 'scene', chunkId: 'left' }, 'message', [
            'selected',
        ]);
        navigation.showScene('left', right);
        navigation.closePane(right);
        expect([
            ...selection.getSelectedIds(
                { kind: 'scene', chunkId: 'left' },
                'message',
            ),
        ]).toEqual(['selected']);
        navigation.closePane(left);
        expect(workspace.activePane.view.kind).toBe('empty');
        expect([
            ...selection.getSelectedIds(
                { kind: 'scene', chunkId: 'left' },
                'message',
            ),
        ]).toEqual(['selected']);
        expect(useCommandContextStore().current.area).toBe('empty');
    });

    it.each([0, 1])(
        'keeps the other pane when pane %i closes and clears its reveal request',
        (index) => {
            const { navigation, workspace } = split();
            const closing = workspace.panes[index];
            const kept = workspace.panes[index === 0 ? 1 : 0];
            if (closing.view.kind !== 'scene')
                throw new Error('Expected scene');
            navigation.requestMessageReveal(
                closing.view.chunkId,
                'message',
                closing.paneId,
            );
            navigation.closePane(closing.paneId);
            expect(workspace.panes.map((p) => p.paneId)).toEqual([kept.paneId]);
            expect(workspace.activePaneId).toBe(kept.paneId);
            expect(useMessageRevealStore().pending).toBeNull();
        },
    );

    it('closes a panel without forgetting its selected tab or search selection', () => {
        const { navigation, workspace } = split();
        navigation.openPanel('search');
        useSelectionStore().select({ kind: 'search' }, 'message', ['message']);
        navigation.closePanel();
        expect(useLayoutStore().activePanel).toBe('search');
        expect(useLayoutStore().sidebarOpen).toBe(false);
        expect(useCommandContextStore().current).toMatchObject({
            area: 'scene',
            paneId: workspace.activePaneId,
        });
        expect(
            useSelectionStore().getSelectedIds({ kind: 'search' }, 'message')
                .size,
        ).toBe(1);
    });

    it('ignores stale scope events and background activation while a modal is open', () => {
        const { navigation, workspace } = split();
        const context = { ...useCommandContextStore().current };
        navigation.activateContext({
            area: 'scene',
            paneId: workspace.activePaneId,
            chunkId: 'stale',
        });
        expect(useCommandContextStore().current).toEqual(context);
        useDialogStore().open('help');
        navigation.openPanel('search');
        navigation.activatePane(workspace.panes[0].paneId);
        expect(useCommandContextStore().current).toEqual(context);
    });
});
