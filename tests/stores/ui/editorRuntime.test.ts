import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, type EffectScope } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useEditorRuntime } from '@/composables/application/useEditorRuntime';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useSelectionContext } from '@/composables/application/useSelectionContext';
import { useProjectManager } from '@/composables/application/useProjectManager';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { imageProject } from '../../helpers/imageProject';

let scope: EffectScope;
beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
    scope = effectScope();
});
afterEach(() => {
    scope.stop();
    vi.unstubAllGlobals();
});

function setup() {
    const fixture = imageProject();
    useLogStore().appendDocuments(fixture.documents);
    scope.run(useEditorRuntime);
    const navigation = useEditorNavigation();
    navigation.showScene(fixture.first.chunkId);
    return { ...fixture, navigation, workspace: useWorkspaceStore() };
}

describe('editor lifecycle coordination', () => {
    it('keeps scene panes, drafts and selections while moving a scene between documents', async () => {
        const { first, last, workspace } = setup();
        const paneId = workspace.activePaneId;
        const selection = useSelectionStore();
        const session = useEditorSessionStore();
        selection.select({ kind: 'scene', chunkId: first.chunkId }, 'message', [
            first.messageId,
        ]);
        session.startEditing(
            {
                kind: 'message',
                chunkId: first.chunkId,
                messageId: first.messageId,
            },
            paneId,
        );
        const targetDocId = useLogStore().findChunkById(last.chunkId)!.docId;
        useLogCommands().moveChunk(first.chunkId, targetDocId, 0);
        await nextTick();
        expect(workspace.activePaneId).toBe(paneId);
        expect(workspace.activePane.view).toEqual({
            kind: 'scene',
            chunkId: first.chunkId,
        });
        expect(session.activeTarget?.kind).toBe('message');
        expect(
            selection.getSelectedIds(
                { kind: 'scene', chunkId: first.chunkId },
                'message',
            ).size,
        ).toBe(1);
        useHistoryStore().undo();
        await nextTick();
        expect(workspace.activePaneId).toBe(paneId);
        expect(workspace.activePane.view.kind).toBe('scene');
    });

    it('ends a draft only when its owning pane closes or changes scene', () => {
        const { first, last, navigation, workspace } = setup();
        const session = useEditorSessionStore();
        const owner = workspace.activePaneId;
        session.startEditing(
            {
                kind: 'message',
                chunkId: first.chunkId,
                messageId: first.messageId,
            },
            owner,
        );
        navigation.splitPane({ kind: 'scene', chunkId: last.chunkId });
        navigation.closePane(workspace.activePaneId);
        expect(session.editingPaneId).toBe(owner);
        navigation.showScene(last.chunkId);
        expect(session.activeTarget).toBeNull();
        session.startEditing(
            {
                kind: 'message',
                chunkId: last.chunkId,
                messageId: last.messageId,
            },
            owner,
        );
        navigation.closePane(owner);
        expect(session.activeTarget).toBeNull();
    });

    it('prunes a deleted scene and its selection for command-driven edits and undo', async () => {
        const { first, last, navigation, workspace } = setup();
        navigation.splitPane({ kind: 'scene', chunkId: last.chunkId });
        const selection = useSelectionStore();
        selection.select({ kind: 'scene', chunkId: last.chunkId }, 'message', [
            last.messageId,
        ]);
        navigation.requestMessageReveal(last.chunkId, last.messageId);
        useLogCommands().deleteChunk(last.chunkId);
        await nextTick();
        expect(workspace.panes).toHaveLength(1);
        expect(workspace.activePane.view).toEqual({
            kind: 'scene',
            chunkId: first.chunkId,
        });
        expect(
            selection.getSelectedIds(
                { kind: 'scene', chunkId: last.chunkId },
                'message',
            ).size,
        ).toBe(0);
        expect(useMessageRevealStore().pending).toBeNull();
        useHistoryStore().undo();
        expect(useLogStore().findChunkById(last.chunkId)).toBeTruthy();
        expect(workspace.panes).toHaveLength(1);
    });

    it('retains selection in the inspector, style panel and preview without routing their commands to messages', () => {
        const { first, navigation } = setup();
        const selection = useSelectionStore();
        selection.select({ kind: 'scene', chunkId: first.chunkId }, 'message', [
            first.messageId,
        ]);
        useLayoutStore().openInspector();
        navigation.activatePanel('inspector');
        expect(
            useSelectionContext().selectedMessages.value.map(
                (m) => m.messageId,
            ),
        ).toEqual([first.messageId]);
        navigation.openPanel('coloring');
        expect(useSelectionContext().selectedMessages.value).toHaveLength(1);
        navigation.showPreview('standard');
        expect(useSelectionContext().selectedMessages.value).toHaveLength(1);
        expect(useCommandContextStore().current.area).toBe('preview');
    });

    it('repairs stale background context when a dialog closes after a scene replacement', () => {
        const { first, last, navigation, workspace } = setup();
        const dialogs = useDialogStore();
        dialogs.open('remoteImport');
        navigation.showScene(last.chunkId);
        expect(useCommandContextStore().current).toMatchObject({
            area: 'scene',
            chunkId: first.chunkId,
        });
        dialogs.closeTop();
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            paneId: workspace.activePaneId,
            chunkId: last.chunkId,
        });
    });

    it('cleans deleted message IDs in both scene and search selections', () => {
        const { first } = setup();
        const selection = useSelectionStore();
        selection.select({ kind: 'scene', chunkId: first.chunkId }, 'message', [
            first.messageId,
        ]);
        selection.select({ kind: 'search' }, 'message', [first.messageId]);
        useLogCommands().batchDeleteMessages(new Set([first.messageId]));
        expect(
            selection.getSelectedIds(
                { kind: 'scene', chunkId: first.chunkId },
                'message',
            ).size,
        ).toBe(0);
        expect(
            selection.getSelectedIds({ kind: 'search' }, 'message').size,
        ).toBe(0);
    });

    it('clears every selection scope, edit draft and reveal when replacing a project', async () => {
        const { first, last, navigation, workspace } = setup();
        const selection = useSelectionStore();
        selection.select({ kind: 'scene', chunkId: first.chunkId }, 'message', [
            first.messageId,
        ]);
        selection.select({ kind: 'search' }, 'message', [last.messageId]);
        useEditorSessionStore().startEditing(
            {
                kind: 'message',
                chunkId: first.chunkId,
                messageId: first.messageId,
            },
            workspace.activePaneId,
        );
        navigation.requestMessageReveal(first.chunkId, first.messageId);
        navigation.showPreview('standard');
        await useProjectManager().replaceWorkspaceWithProject(
            {
                projectId: 'new-project',
                projectName: '新工程',
                time: '',
                documents: imageProject().documents,
                styleRules: [],
                viewSettings: { ...useStyleStore().viewSettings },
            },
            { confirmIfNeeded: false, resourcesReady: true },
        );
        expect(selection.selections.size).toBe(0);
        expect(useEditorSessionStore().activeTarget).toBeNull();
        expect(useMessageRevealStore().pending).toBeNull();
        expect(workspace.panes).toHaveLength(1);
        expect(workspace.activePane.view).toEqual({
            kind: 'scene',
            chunkId: useLogStore().allChunks[0].chunkId,
        });
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            paneId: workspace.activePaneId,
            chunkId: useLogStore().allChunks[0].chunkId,
        });
    });
});
