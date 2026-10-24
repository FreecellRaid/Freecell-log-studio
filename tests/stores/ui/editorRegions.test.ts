import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';

describe('explicit editor regions', () => {
    beforeEach(() => setActivePinia(createPinia()));

    it('keeps one or two directly owned panes and stable pane identity on replacement', () => {
        const workspace = useWorkspaceStore();
        expect(workspace.panes).toHaveLength(1);
        expect(workspace.splitPane({ kind: 'scene', chunkId: 'right' })).toBe(
            false,
        );
        workspace.showScene('left');
        const leftId = workspace.activePaneId;
        workspace.splitPane({ kind: 'scene', chunkId: 'right' });
        const rightId = workspace.activePaneId;
        useLayoutStore().openPanel('search');
        workspace.showScene('new');
        expect(workspace.panes.map((p) => p.view)).toEqual([
            { kind: 'scene', chunkId: 'left' },
            { kind: 'scene', chunkId: 'new' },
        ]);
        expect(workspace.activePaneId).toBe(rightId);
        workspace.closeSplit(leftId);
        expect(workspace.activePaneId).toBe(leftId);
        expect(workspace.panes).toHaveLength(1);
        workspace.closePane(leftId);
        expect(workspace.activePane.view.kind).toBe('empty');
    });

    it('shows previews beside scenes and replaces previews without retaining hidden views', () => {
        const workspace = useWorkspaceStore();
        workspace.showScene('scene');
        const sceneId = workspace.activePaneId;
        workspace.showPreview('one');
        const previewId = workspace.activePaneId;
        expect(workspace.isSplit).toBe(true);
        workspace.showPreview('two');
        expect(workspace.activePaneId).toBe(previewId);
        expect(workspace.panes).toHaveLength(2);
        workspace.closePane(previewId);
        expect(workspace.activePaneId).toBe(sceneId);
        expect(workspace.activePane.view).toEqual({
            kind: 'scene',
            chunkId: 'scene',
        });
    });

    it('prunes missing scenes and ignores invalid pane actions and resize values', () => {
        const workspace = useWorkspaceStore();
        workspace.showScene('left');
        workspace.splitPane({ kind: 'scene', chunkId: 'right' });
        expect(workspace.pruneScenes((id) => id === 'right')).toBe(true);
        const pane = workspace.activePaneId;
        workspace.activatePane('missing');
        workspace.showScene('ignored', 'missing');
        workspace.closePane('missing');
        workspace.setRatio(100);
        expect(workspace.ratio).toBe(80);
        workspace.setRatio(Number.NaN);
        expect(workspace.ratio).toBe(80);
        expect(workspace.activePaneId).toBe(pane);
        expect(workspace.pruneScenes(() => false)).toBe(false);
        expect(workspace.activePane.view.kind).toBe('empty');
    });

    it('keeps panel visibility, inspector visibility and dialogs independent', () => {
        const layout = useLayoutStore();
        const dialogs = useDialogStore();
        layout.initialize(false);
        layout.initialize(true);
        layout.openPanel('search');
        layout.openInspector();
        dialogs.open('help');
        dialogs.open('remoteImport');
        dialogs.open('help');
        expect(dialogs.stack).toEqual(['remoteImport', 'help']);
        expect(dialogs.top).toBe('help');
        layout.closePanel();
        expect(layout.activePanel).toBe('search');
        expect(layout.inspectorOpen).toBe(true);
        expect(dialogs.isBlocking).toBe(true);
        dialogs.closeTop();
        expect(dialogs.top).toBe('remoteImport');
        dialogs.closeTop();
        expect(dialogs.isBlocking).toBe(false);
    });

    it('does not clear a newer message reveal when an older request finishes', () => {
        const reveal = useMessageRevealStore();
        reveal.request('pane', 'scene', 'first');
        const first = reveal.pending!.requestId;
        reveal.request('pane', 'scene', 'second');
        reveal.clear(first);
        expect(reveal.pending?.messageId).toBe('second');
    });
});
