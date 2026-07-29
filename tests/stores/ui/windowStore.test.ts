import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';

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
