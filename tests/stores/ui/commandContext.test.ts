import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useWindowStore } from '@/stores/ui/windowStore';
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
        const windows = useWindowStore();
        windows.setActiveChunk(left.chunkId);
        const leftWindow = windows.currentActiveView.windowId;
        windows.openSplitView('chunkView', right.chunkId);
        const rightWindow = windows.currentActiveView.windowId;
        return { log, left, right, windows, leftWindow, rightWindow };
    }

    it('dispatches selection and deletion using the explicit scene, independently of focus history', () => {
        const { log, left, right, windows, leftWindow } = setupScenes();
        const context = useCommandContextStore();
        const { dispatch } = useCommandDispatcher();
        // 布局和旧焦点仍停在右侧；命令明确作用于左侧。
        context.activate({
            area: 'scene',
            windowId: leftWindow,
            chunkId: left.chunkId,
        });
        windows.focusStack = [];
        dispatch('selectAll');
        const selection = useSelectionStore();
        expect([...selection.getSelectedIds(left.chunkId, 'message')]).toEqual([
            left.messages[0].messageId,
        ]);
        expect(selection.getSelectedIds(right.chunkId, 'message').size).toBe(0);
        dispatch('delete');
        expect(log.findChunkById(left.chunkId)?.messages).toEqual([]);
        expect(log.findChunkById(right.chunkId)?.messages).toHaveLength(1);
    });

    it('keeps the active pane when search takes command ownership and jumps into that pane', () => {
        const { left, windows, rightWindow } = setupScenes();
        windows.openLeftPanel('search');
        const search = useSearchStore();
        search.quickSearch = '甲';
        const { dispatch } = useCommandDispatcher();
        dispatch('selectAll');
        expect(useCommandContextStore().current).toEqual({
            area: 'panel',
            panel: 'search',
        });
        expect(windows.currentActiveView.windowId).toBe(rightWindow);
        expect([
            ...useSelectionStore().getSelectedIds('search', 'message'),
        ]).toEqual([left.messages[0].messageId]);
        dispatch('jump');
        expect(windows.getActivePaneIndex()).toBe(1);
        expect(windows.currentActiveView.target).toEqual({
            kind: 'chunk',
            chunkId: left.chunkId,
        });
        expect(windows.pendingMessageReveal?.messageId).toBe(
            left.messages[0].messageId,
        );
        expect(useCommandContextStore().current.area).toBe('scene');
    });

    it('opens replacement with the explicit scene selection rather than the historical selection', () => {
        const { left, windows, leftWindow } = setupScenes();
        useSelectionStore().select(
            left.chunkId,
            'message',
            [left.messages[0].messageId],
            false,
        );
        useCommandContextStore().activate({
            area: 'scene',
            windowId: leftWindow,
            chunkId: left.chunkId,
        });
        windows.focusStack = [];
        useCommandDispatcher().dispatch('replace');
        expect(useReplacementStore().targetIds).toEqual([
            left.messages[0].messageId,
        ]);
        expect(windows.topModal?.windowName).toBe('replace');
    });

    it('blocks commands through nested dialogs and restores the background command target', () => {
        const { windows, rightWindow } = setupScenes();
        const context = useCommandContextStore();
        const original = { ...context.current };
        const { dispatch } = useCommandDispatcher();
        windows.openModal('help');
        windows.openModal('remoteImport');
        windows.openLeftPanel('search');
        expect(context.current).toEqual(original);
        dispatch('selectAll');
        expect(
            useSelectionStore().getSelectedIds('search', 'message').size,
        ).toBe(0);
        dispatch('cancel');
        expect(windows.topModal?.windowName).toBe('help');
        expect(context.current).toEqual(original);
        dispatch('cancel');
        expect(windows.topModal).toBeNull();
        expect(context.current).toEqual(original);
        expect(windows.currentActiveView.windowId).toBe(rightWindow);
    });

    it('falls back to a remaining pane or empty workspace when the command owner closes', () => {
        const { windows, leftWindow, rightWindow, left } = setupScenes();
        windows.unregisterWindow(rightWindow);
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            windowId: leftWindow,
            chunkId: left.chunkId,
        });
        windows.unregisterWindow(leftWindow);
        expect(useCommandContextStore().current).toEqual({
            area: 'empty',
            windowId: 'defaultView',
        });
        windows.openLeftPanel('search');
        windows.closeLeftPanel();
        expect(useCommandContextStore().current.area).toBe('empty');
    });

    it('updates programmatic pane replacement and preserves shared scene selection', () => {
        const { windows, left, leftWindow } = setupScenes();
        useSelectionStore().select(
            left.chunkId,
            'message',
            [left.messages[0].messageId],
            false,
        );
        windows.setPaneView(1, 'chunkView', left.chunkId);
        expect(useCommandContextStore().current).toMatchObject({
            area: 'scene',
            chunkId: left.chunkId,
        });
        windows.closeSplitView(leftWindow);
        expect(useCommandContextStore().current).toEqual({
            area: 'scene',
            windowId: leftWindow,
            chunkId: left.chunkId,
        });
        expect(
            useSelectionStore().getSelectedIds(left.chunkId, 'message').size,
        ).toBe(1);
    });

    it('makes preview a command target without letting scene-local commands leak through', () => {
        const { windows, right } = setupScenes();
        const selection = useSelectionStore();
        selection.select(
            right.chunkId,
            'message',
            [right.messages[0].messageId],
            false,
        );
        windows.openExportPreview('template');
        expect(useCommandContextStore().current.area).toBe('preview');
        useCommandDispatcher().dispatch('delete');
        expect(
            useLogStore().findChunkById(right.chunkId)?.messages,
        ).toHaveLength(1);
    });
});
