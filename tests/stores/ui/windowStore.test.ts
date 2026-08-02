import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';
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

        store.setFocus('chunkList');

        expect(store.getActivePaneIndex()).toBe(1);
        expect(store.workspacePanes[1]?.isActive).toBe(true);
    });

    it('replaces the last active pane after focusing a side panel', () => {
        const store = createSplitView();
        const rightWindowId = store.workspacePanes[1]?.instance?.windowId;
        expect(rightWindowId).toBeTruthy();

        store.setFocus(rightWindowId!);
        store.setFocus('chunkList');
        store.setPaneView(store.getActivePaneIndex(), 'chunkView', 'chunk-new');

        expect(store.workspacePanes[0]?.instance?.originalId).toBe(
            'chunk-left',
        );
        expect(store.workspacePanes[1]?.instance?.originalId).toBe('chunk-new');
    });

    it('keeps the last active pane when closing a split view', () => {
        const store = createSplitView();
        store.setFocus('chunkList');

        store.closeSplitView();

        expect(store.hasSplitView).toBe(false);
        expect(store.workspacePanes[0]?.instance?.originalId).toBe(
            'chunk-right',
        );
        expect(store.getActivePaneIndex()).toBe(0);
    });
});
