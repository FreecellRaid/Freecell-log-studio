import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';
import { selectMobileView } from '@/windows/selectMobileView';
import { windowDefinitions } from '@/windows/windowDefinitions';

describe('mobile workspace projection', () => {
    beforeEach(() => setActivePinia(createPinia()));

    it('uses default view when no scene or preview is open', () => {
        const store = useWindowStore();
        store.openLeftPanel();
        store.openHelpDocument();
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowName,
        ).toBe('defaultView');
    });

    it('shows a registered scene even when default view has focus', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        store.setFocus('defaultView');
        expect(
            selectMobileView(store.openWindows, store.focusStack),
        ).toMatchObject({
            windowName: 'chunkView',
            target: { kind: 'chunk', chunkId: 'scene' },
        });
    });

    it('prioritizes preview while the desktop scene pane or a panel has focus', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        const previewId = store.currentActiveView.windowId;
        store.setFocus(sceneId);
        store.openLeftPanel();
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(previewId);
        expect(store.currentActiveView.windowId).toBe(sceneId);
    });

    it('shows the latest focused preview, then the remaining preview after close', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        const firstId = store.currentActiveView.windowId;
        store.openSplitView('exportPreview', 'markdown');
        const secondId = store.currentActiveView.windowId;
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(secondId);
        store.setFocus(firstId);
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(firstId);
        store.unregisterWindow(firstId);
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(secondId);
    });

    it('includes open previews outside the currently rendered desktop pane', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        const previewId = store.currentActiveView.windowId;
        store.setActiveChunk('scene');
        expect(store.currentActiveView.windowName).toBe('chunkView');
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(previewId);
    });

    it('returns to scene then default as preview and scene windows close', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        store.unregisterWindow(store.currentActiveView.windowId);
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowId,
        ).toBe(sceneId);
        store.unregisterWindow(sceneId);
        expect(
            selectMobileView(store.openWindows, store.focusStack)?.windowName,
        ).toBe('defaultView');
    });

    it('uses latest registered matching window when focus history is empty or stale', () => {
        const store = useWindowStore();
        store.openExportPreview('standard');
        store.openSplitView('exportPreview', 'markdown');
        const latest = store.currentActiveView.windowId;
        expect(selectMobileView(store.openWindows, ['missing'])?.windowId).toBe(
            latest,
        );
    });

    it('projects without mutating desktop layout or focus', () => {
        const store = useWindowStore();
        store.setActiveChunk('scene');
        const sceneId = store.currentActiveView.windowId;
        store.openExportPreview('standard');
        store.setFocus(sceneId);
        const layout = [...store.paneWindowIds];
        const focus = [...store.focusStack];
        selectMobileView(store.openWindows, store.focusStack);
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
