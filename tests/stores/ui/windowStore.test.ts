import { getWindowTargetId } from '@/types/window';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';

describe('window registry state', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('derives left panel visibility from the window registry', () => {
        const store = useWindowStore();

        expect(store.selectedLeftPanel).toBe('chunkList');
        expect(store.isWindowOpen('chunkList')).toBe(false);

        store.openLeftPanel();
        expect(store.isWindowOpen('chunkList')).toBe(true);

        store.selectLeftPanel('search');
        expect(store.selectedLeftPanel).toBe('search');
        expect(store.isWindowOpen('chunkList')).toBe(false);
        expect(store.isWindowOpen('search')).toBe(true);
        expect(store.activeFocus).toBe('search');

        store.closeLeftPanel();
        expect(store.isWindowOpen('search')).toBe(false);
        expect(store.selectedLeftPanel).toBe('search');

        store.openLeftPanel();
        expect(store.isWindowOpen('search')).toBe(true);
    });

    it('derives inspector and help visibility from the window registry', () => {
        const store = useWindowStore();

        store.openInspector();
        store.openHelpDocument();
        expect(store.isWindowOpen('inspector')).toBe(true);
        expect(store.isWindowOpen('help')).toBe(true);

        store.closeInspector();
        store.closeHelpDocument();
        expect(store.isWindowOpen('inspector')).toBe(false);
        expect(store.isWindowOpen('help')).toBe(false);
    });

    it('uses the window registry as the mobile bottom panel source', () => {
        const windowStore = useWindowStore();
        const mobileUiStore = useMobileUiStore();

        mobileUiStore.openBottomPanel();
        expect(mobileUiStore.bottomPanelOpen).toBe(true);
        expect(windowStore.isWindowOpen('chunkList')).toBe(true);

        mobileUiStore.openLeftDrawer();
        expect(mobileUiStore.leftDrawerOpen).toBe(true);
        expect(mobileUiStore.bottomPanelOpen).toBe(false);

        mobileUiStore.openBottomPanel();
        expect(mobileUiStore.leftDrawerOpen).toBe(false);
        expect(mobileUiStore.bottomPanelOpen).toBe(true);

        mobileUiStore.closeOverlay();
        expect(mobileUiStore.bottomPanelOpen).toBe(false);
    });

    it('initializes only the first layout and preserves registry state later', () => {
        const desktopStore = useWindowStore();
        desktopStore.initializeLayout(false);
        expect(desktopStore.isWindowOpen('chunkList')).toBe(true);
        desktopStore.initializeLayout(true);
        expect(desktopStore.isWindowOpen('chunkList')).toBe(true);

        setActivePinia(createPinia());
        const mobileStore = useWindowStore();
        mobileStore.initializeLayout(true);
        expect(mobileStore.isWindowOpen('chunkList')).toBe(false);
        mobileStore.initializeLayout(false);
        expect(mobileStore.isWindowOpen('chunkList')).toBe(false);
    });
});

describe('workspace pane focus', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    function createSplitView() {
        const store = useWindowStore();
        store.setActiveChunk('chunk-left');
        expect(store.openSplitView('chunkView', 'chunk-right')).toBe(true);
        return store;
    }

    it('keeps the active pane when a side panel receives focus', () => {
        const store = createSplitView();
        expect(store.getActivePaneIndex()).toBe(1);

        store.openLeftPanel();

        expect(store.getActivePaneIndex()).toBe(1);
        expect(store.workspacePanes[1]?.isActive).toBe(true);
    });

    it('replaces the last active pane after focusing a side panel', () => {
        const store = createSplitView();
        const rightWindowId = store.workspacePanes[1]?.instance?.windowId;
        expect(rightWindowId).toBeTruthy();

        store.setFocus(rightWindowId!);
        store.openLeftPanel();
        store.setPaneView(store.getActivePaneIndex(), 'chunkView', 'chunk-new');

        expect(getWindowTargetId(store.workspacePanes[0]!.instance!)).toBe(
            'chunk-left',
        );
        expect(getWindowTargetId(store.workspacePanes[1]!.instance!)).toBe(
            'chunk-new',
        );
    });

    it('keeps the last active pane when closing a split view', () => {
        const store = createSplitView();
        store.openLeftPanel();

        store.closeSplitView();

        expect(store.hasSplitView).toBe(false);
        expect(getWindowTargetId(store.workspacePanes[0]!.instance!)).toBe(
            'chunk-right',
        );
        expect(store.getActivePaneIndex()).toBe(0);
    });
});

describe('workspace lifecycle consistency', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    function createSplitView(sameChunk = false) {
        const store = useWindowStore();
        store.setActiveChunk('left');
        store.openSplitView('chunkView', sameChunk ? 'left' : 'right');
        return store;
    }

    it('registers a persistent default view and ignores invalid focus targets', () => {
        const store = useWindowStore();
        expect(store.currentActiveView).toBe(
            store.openWindows.get('defaultView'),
        );
        store.setFocus('missing');
        store.unregisterWindow('defaultView');
        expect(store.focusStack).toEqual([]);
        expect(store.activeFocus).toBe('defaultView');
        expect(store.isWindowOpen('defaultView')).toBe(true);
    });

    it('keeps the workspace view across more than five panel/modal focuses', () => {
        const store = useWindowStore();
        store.setActiveChunk('left');
        const id = store.currentActiveView.windowId;
        for (const name of [
            'chunkList',
            'identity',
            'search',
            'ruleEditor',
            'exportFormat',
        ] as const) {
            store.registerWindow({
                windowId: name,
                windowName: name,
            });
        }
        store.openHelpDocument();
        expect(store.currentActiveView.windowId).toBe(id);
        expect(store.focusStack).toContain(id);
        expect(store.activeFocus).toBe('help');
    });

    it('reuses a scene window and retains its selection when reopened', () => {
        const store = useWindowStore();
        store.setActiveChunk('left');
        const id = store.currentActiveView.windowId;
        const selections = useSelectionStore();
        selections.select('left', 'message', ['message-1'], false);
        store.setActiveChunk('left');
        expect(store.currentActiveView.windowId).toBe(id);
        expect([...selections.getSelectedIds('left', 'message')]).toEqual([
            'message-1',
        ]);
        expect(
            [...store.openWindows.values()].filter(
                (win) => win.windowName === 'chunkView',
            ),
        ).toHaveLength(1);
    });

    it.each([0, 1] as const)(
        'keeps pane %i and its selection when exiting split view',
        (paneIndex) => {
            const store = createSplitView();
            const retained = store.workspacePanes[paneIndex]!.instance!;
            const removed =
                store.workspacePanes[paneIndex === 0 ? 1 : 0]!.instance!;
            const selections = useSelectionStore();
            selections.select(
                getWindowTargetId(retained),
                'message',
                ['keep'],
                false,
            );
            selections.select(
                getWindowTargetId(removed),
                'message',
                ['remove'],
                false,
            );
            store.closeSplitView(retained.windowId);
            expect(store.currentActiveView).toBe(
                store.openWindows.get(retained.windowId),
            );
            expect(store.paneWindowIds).toEqual([retained.windowId, null]);
            expect(store.isWindowOpen(removed.windowId)).toBe(false);
            expect([
                ...selections.getSelectedIds(
                    getWindowTargetId(retained),
                    'message',
                ),
            ]).toEqual(['keep']);
            expect(
                selections.getSelectedIds(getWindowTargetId(removed), 'message')
                    .size,
            ).toBe(0);
        },
    );

    it('clears shared selection only when the final same-source window closes', () => {
        const store = createSplitView(true);
        const selections = useSelectionStore();
        selections.select('left', 'message', ['keep'], false);
        store.closePane(store.workspacePanes[1]!.instance!.windowId);
        expect([...selections.getSelectedIds('left', 'message')]).toEqual([
            'keep',
        ]);
        store.closePane(store.currentActiveView.windowId);
        expect(selections.getSelectedIds('left', 'message').size).toBe(0);
        expect(store.currentActiveView.windowName).toBe('defaultView');
    });

    it.each([0, 1] as const)(
        'collapses layout when pane %i is unregistered directly',
        (paneIndex) => {
            const store = createSplitView();
            const closing = store.workspacePanes[paneIndex]!.instance!.windowId;
            const remaining =
                store.workspacePanes[paneIndex === 0 ? 1 : 0]!.instance!
                    .windowId;
            store.unregisterWindow(closing);
            expect(store.hasSplitView).toBe(false);
            expect(store.paneWindowIds).toEqual([remaining, null]);
            expect(store.focusStack).not.toContain(closing);
            expect(store.currentActiveView.windowId).toBe(remaining);
        },
    );

    it('replaces a pane without closing the other pane and reuses an unchanged target', () => {
        const store = createSplitView();
        const left = store.workspacePanes[0]!.instance!.windowId;
        const oldRight = store.workspacePanes[1]!.instance!.windowId;
        store.setPaneView(1, 'chunkView', 'new');
        const newRight = store.currentActiveView.windowId;
        expect(store.paneWindowIds).toEqual([left, newRight]);
        expect(store.isWindowOpen(oldRight)).toBe(false);
        expect(store.hasSplitView).toBe(true);
        store.setPaneView(1, 'chunkView', 'new');
        expect(store.currentActiveView.windowId).toBe(newRight);
    });

    it('changes only the active scene pane through setActiveChunk', () => {
        const store = createSplitView();
        const left = store.workspacePanes[0]!.instance!.windowId;
        store.setActiveChunk('new');
        expect(store.hasSplitView).toBe(true);
        expect(store.workspacePanes[0]!.instance!.windowId).toBe(left);
        expect(getWindowTargetId(store.currentActiveView)).toBe('new');
    });

    it('prunes deleted scenes and leaves no stale pane references', () => {
        const store = createSplitView();
        expect(store.pruneOrphanChunkViews((id) => id === 'right')).toBe(true);
        expect(store.hasSplitView).toBe(false);
        expect(getWindowTargetId(store.currentActiveView)).toBe('right');
        expect(store.pruneOrphanChunkViews(() => false)).toBe(false);
        expect(store.paneWindowIds).toEqual(['defaultView', null]);
        expect(store.currentActiveView.windowName).toBe('defaultView');
        expect(store.focusStack.every((id) => store.openWindows.has(id))).toBe(
            true,
        );
    });

    it('toggles a preview by format ID and returns to the scene', () => {
        const store = useWindowStore();
        store.setActiveChunk('left');
        const sceneId = store.currentActiveView.windowId;
        store.toggleExportPreview('format-1');
        expect(getWindowTargetId(store.currentActiveView)).toBe('format-1');
        const previewId = store.currentActiveView.windowId;
        expect(previewId).not.toBe('format-1');
        store.toggleExportPreview('format-1');
        expect(store.isWindowOpen(previewId)).toBe(false);
        expect(store.currentActiveView.windowId).toBe(sceneId);
        expect(store.hasSplitView).toBe(false);
    });

    it('replaces preview formats without leaving the old instance registered', () => {
        const store = useWindowStore();
        store.openExportPreview('format-1');
        const firstId = store.currentActiveView.windowId;
        store.openExportPreview('format-2');
        expect(getWindowTargetId(store.currentActiveView)).toBe('format-2');
        expect(store.isWindowOpen(firstId)).toBe(false);
        expect(store.hasSplitView).toBe(false);
        store.unregisterWindow(store.currentActiveView.windowId);
        expect(store.activeFocus).toBe('defaultView');
    });
});
