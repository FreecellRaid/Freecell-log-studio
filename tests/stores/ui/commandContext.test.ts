import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';
import { useLogStore } from '@/stores/project/logStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useSearchStore } from '@/stores/editor/searchStore';
import { useReplacementStore } from '@/stores/editor/replacementStore';
import { useCommandDispatcher } from '@/composables/application/useCommandDispatcher';
import { buildLogDocument } from '@/io/import/parser';

describe('explicit command context', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.stubGlobal('localStorage', {
            getItem: () => null,
            setItem: vi.fn(),
        });
        vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    });
    afterEach(() => vi.unstubAllGlobals());

    function setupScenes() {
        const log = useLogStore();
        log.appendDocuments([
            buildLogDocument([{ content: '甲', playerName: '甲' }], '左侧', 0),
            buildLogDocument([{ content: '乙', playerName: '乙' }], '右侧', 1),
        ]);
        const [left, right] = log.allChunks;
        const navigation = useEditorNavigation();
        navigation.showScene(left.chunkId);
        const leftPane = useWorkspaceStore().activePaneId;
        navigation.splitPane({ kind: 'scene', chunkId: right.chunkId });
        const rightPane = useWorkspaceStore().activePaneId;
        return { log, left, right, navigation, leftPane, rightPane };
    }

    it('dispatches selection and deletion using the explicit scene, independently of the active layout pane', () => {
        const { log, left, right, leftPane } = setupScenes();
        const context = useCommandContextStore();
        const { dispatch } = useCommandDispatcher();
        // 布局仍停在右侧；命令明确作用于左侧。
        context.activate({
            area: 'scene',
            paneId: leftPane,
            chunkId: left.chunkId,
        });

        dispatch('selectAll');
        const selection = useSelectionStore();
        expect([
            ...selection.getSelectedIds(
                { kind: 'scene', chunkId: left.chunkId },
                'message',
            ),
        ]).toEqual([left.messages[0].messageId]);
        expect(
            selection.getSelectedIds(
                { kind: 'scene', chunkId: right.chunkId },
                'message',
            ).size,
        ).toBe(0);
        dispatch('delete');
        expect(log.findChunkById(left.chunkId)?.messages).toEqual([]);
        expect(log.findChunkById(right.chunkId)?.messages).toHaveLength(1);
    });

    it('keeps the active pane when search takes command ownership and jumps into that pane', () => {
        const { left, navigation, rightPane } = setupScenes();
        navigation.openPanel('search');
        const search = useSearchStore();
        search.quickSearch = '甲';
        const { dispatch } = useCommandDispatcher();
        dispatch('selectAll');
        expect(useCommandContextStore().current).toEqual({
            area: 'panel',
            panel: 'search',
        });
        expect(useWorkspaceStore().activePaneId).toBe(rightPane);
        expect([
            ...useSelectionStore().getSelectedIds(
                { kind: 'search' },
                'message',
            ),
        ]).toEqual([left.messages[0].messageId]);
        dispatch('jump');
        expect(
            useWorkspaceStore().panes.findIndex(
                (p) => p.paneId === useWorkspaceStore().activePaneId,
            ),
        ).toBe(1);
        expect(useWorkspaceStore().activePane.view).toEqual({
            kind: 'scene',
            chunkId: left.chunkId,
        });
        expect(useMessageRevealStore().pending?.messageId).toBe(
            left.messages[0].messageId,
        );
        expect(useCommandContextStore().current.area).toBe('scene');
    });

    it('opens replacement with the explicit scene selection rather than the historical selection', () => {
        const { left, leftPane } = setupScenes();
        useSelectionStore().select(
            { kind: 'scene', chunkId: left.chunkId },
            'message',
            [left.messages[0].messageId],
            false,
        );
        useCommandContextStore().activate({
            area: 'scene',
            paneId: leftPane,
            chunkId: left.chunkId,
        });

        useCommandDispatcher().dispatch('replace');
        expect(useReplacementStore().targetIds).toEqual([
            left.messages[0].messageId,
        ]);
        expect(useDialogStore().top).toBe('replace');
    });

    it('blocks commands through nested dialogs and restores the background command target', () => {
        const { navigation, rightPane } = setupScenes();
        const context = useCommandContextStore();
        const original = { ...context.current };
        const { dispatch } = useCommandDispatcher();
        useDialogStore().open('help');
        useDialogStore().open('remoteImport');
        // 模态期间不激活背景区域。
        navigation.activatePanel('search');
        expect(context.current).toEqual(original);
        dispatch('selectAll');
        expect(
            useSelectionStore().getSelectedIds({ kind: 'search' }, 'message')
                .size,
        ).toBe(0);
        dispatch('cancel');
        expect(useDialogStore().top).toBe('help');
        expect(context.current).toEqual(original);
        dispatch('cancel');
        expect(useDialogStore().top).toBeNull();
        expect(context.current).toEqual(original);
        expect(useWorkspaceStore().activePaneId).toBe(rightPane);
    });

    it('falls back to a remaining pane or empty workspace when the command owner closes', () => {
        const { navigation, leftPane, rightPane, left } = setupScenes();
        navigation.closePane(rightPane);
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            paneId: leftPane,
            chunkId: left.chunkId,
        });
        navigation.closePane(leftPane);
        expect(useCommandContextStore().current).toEqual({
            area: 'empty',
            paneId: useWorkspaceStore().activePaneId,
        });
        navigation.openPanel('search');
        navigation.closePanel();
        expect(useCommandContextStore().current.area).toBe('empty');
    });

    it('updates programmatic pane replacement and preserves shared scene selection', () => {
        const { navigation, left, leftPane } = setupScenes();
        useSelectionStore().select(
            { kind: 'scene', chunkId: left.chunkId },
            'message',
            [left.messages[0].messageId],
            false,
        );
        navigation.showScene(left.chunkId, useWorkspaceStore().panes[1].paneId);
        expect(useCommandContextStore().current).toMatchObject({
            area: 'scene',
            chunkId: left.chunkId,
        });
        navigation.closeSplit(leftPane);
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            paneId: leftPane,
            chunkId: left.chunkId,
        });
        expect(
            useSelectionStore().getSelectedIds(
                { kind: 'scene', chunkId: left.chunkId },
                'message',
            ).size,
        ).toBe(1);
    });

    it('makes preview a command target without letting scene-local commands leak through', () => {
        const { navigation, right } = setupScenes();
        const selection = useSelectionStore();
        selection.select(
            { kind: 'scene', chunkId: right.chunkId },
            'message',
            [right.messages[0].messageId],
            false,
        );
        navigation.showPreview('template');
        expect(useCommandContextStore().current.area).toBe('preview');
        useCommandDispatcher().dispatch('delete');
        expect(
            useLogStore().findChunkById(right.chunkId)?.messages,
        ).toHaveLength(1);
    });
});
