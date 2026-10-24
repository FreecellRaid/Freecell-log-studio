import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';
import { windowDefinitions } from '@/types/window';

describe('mobile workspace projection', () => {
    beforeEach(() => setActivePinia(createPinia()));

    it('uses default view when no scene or preview is open', () => {
        const store = useWindowStore();
        store.openLeftPanel();
        store.openHelpDocument();
        expect(store.lastFocusedView.windowName).toBe('defaultView');
    });

    it('shows default view when it is the latest focused view', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        store.setFocus('defaultView');
        expect(store.lastFocusedView).toMatchObject({
            windowName: 'defaultView',
        });
    });

    it('switches between scene and preview by focus while ignoring panels and modals', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        const previewId = store.currentActiveView.windowId;
        expect(store.lastFocusedView.windowId).toBe(previewId);
        store.setFocus(sceneId);
        store.openLeftPanel();
        store.openHelpDocument();
        expect(store.lastFocusedView.windowId).toBe(sceneId);
        expect(store.currentActiveView.windowId).toBe(sceneId);
        store.setFocus(previewId);
        expect(store.lastFocusedView.windowId).toBe(previewId);
    });

    it('shows the latest focused preview, then the remaining preview after close', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        const firstId = store.currentActiveView.windowId;
        store.openSplitView('exportPreview', 'markdown');
        const secondId = store.currentActiveView.windowId;
        expect(store.lastFocusedView.windowId).toBe(secondId);
        store.setFocus(firstId);
        expect(store.lastFocusedView.windowId).toBe(firstId);
        store.unregisterWindow(firstId);
        expect(store.lastFocusedView.windowId).toBe(secondId);
    });

    it('keeps an unfocused preview registered while displaying the focused scene', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        const previewId = store.currentActiveView.windowId;
        store.setActiveChunk('scene');
        expect(store.currentActiveView.windowName).toBe('chunkView');
        expect(store.isWindowOpen(previewId)).toBe(true);
        expect(store.lastFocusedView.windowId).toBe(
            store.currentActiveView.windowId,
        );
    });

    it('returns to scene then default as preview and scene windows close', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        store.unregisterWindow(store.currentActiveView.windowId);
        expect(store.lastFocusedView.windowId).toBe(sceneId);
        store.unregisterWindow(sceneId);
        expect(store.lastFocusedView.windowName).toBe('defaultView');
    });

    it('falls back to default view when focus history is empty or stale', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        store.openSplitView('exportPreview', 'markdown');
        for (const focus of [[], ['missing']]) {
            store.focusStack = focus;
            expect(store.lastFocusedView.windowId).toBe('defaultView');
        }
    });

    it('ignores stale entries above the most recently focused view', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        store.focusStack.push('missing');
        expect(store.lastFocusedView.windowId).toBe(
            store.currentActiveView.windowId,
        );
    });

    it('returns to the scene when closing a preview while a panel has focus', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        const previewId = store.currentActiveView.windowId;
        store.openLeftPanel();
        store.unregisterWindow(previewId);
        expect(store.lastFocusedView.windowId).toBe(sceneId);
        store.closeLeftPanel();
        expect(store.activeFocus).toBe(sceneId);
        expect(store.currentActiveView.windowId).toBe(sceneId);
    });

    it('projects without mutating desktop layout or focus', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        store.setFocus(sceneId);
        const layout = [...store.paneWindowIds];
        const focus = [...store.focusStack];
        expect(store.lastFocusedView.windowId).toBe(sceneId);
        expect(store.paneWindowIds).toEqual(layout);
        expect(store.focusStack).toEqual(focus);
    });

    it('enforces singleton identity through definitions while allowing multiple scene instances', () => {
        const store = useWindowStore();
        store.registerWindow({ windowId: 'help-other', windowName: 'help' });
        store.openHelpDocument();
        expect(
            [...store.openWindows.values()].filter(
                (win) => win.windowName === 'help',
            ),
        ).toHaveLength(1);
        expect(store.activeFocus).toBe('help');
        expect(windowDefinitions.help.blocksCommands).toBe(true);
        store.setActiveChunk('scene');
        store.openSplitView('chunkView', 'scene');
        expect(
            [...store.openWindows.values()].filter(
                (win) => win.windowName === 'chunkView',
            ),
        ).toHaveLength(2);
    });
});
