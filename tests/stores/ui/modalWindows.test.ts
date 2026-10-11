import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useCommandDispatcher } from '@/composables/application/useCommandDispatcher';
import { useRemoteImportStore } from '@/stores/io/remoteImportStore';

describe('shared modal lifecycle', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.stubGlobal('localStorage', {
            getItem: () => null,
            setItem: vi.fn(),
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('keeps modal priority when a background pane or panel receives focus', () => {
        const windows = useWindowStore();
        windows.setActiveChunk('scene');
        const sceneId = windows.currentActiveView.windowId;
        windows.openHelpDocument();
        windows.openModal('remoteImport');
        windows.setFocus(sceneId);
        windows.openLeftPanel();
        expect(windows.openModals.map((win) => win.windowName)).toEqual([
            'help',
            'remoteImport',
        ]);
        expect(windows.activeFocus).toBe('remoteImport');
        expect(windows.currentActiveView.windowId).toBe(sceneId);
    });

    it('raises an existing modal without duplicating it', () => {
        const windows = useWindowStore();
        windows.openModal('help');
        windows.openModal('remoteImport');
        windows.openHelpDocument();
        expect(windows.openModals.map((win) => win.windowName)).toEqual([
            'remoteImport',
            'help',
        ]);
        windows.closeTopModal();
        expect(windows.topModal?.windowName).toBe('remoteImport');
        windows.closeTopModal();
        expect(windows.topModal).toBeNull();
        expect(windows.activeFocus).toBe('defaultView');
    });

    it('blocks background commands and cancels the top modal rather than always closing help', () => {
        const windows = useWindowStore();
        const remote = useRemoteImportStore();
        const { dispatch } = useCommandDispatcher();
        windows.openHelpDocument();
        remote.open();
        windows.setFocus('defaultView');
        dispatch('toggleLeft');
        expect(windows.isWindowOpen('chunkList')).toBe(false);
        dispatch('cancel');
        expect(windows.isWindowOpen('help')).toBe(true);
        dispatch('cancel');
        expect(windows.topModal).toBeNull();
        dispatch('toggleLeft');
        expect(windows.isWindowOpen('chunkList')).toBe(true);
    });

    it('keeps modal blocking after focus history is reset', () => {
        const windows = useWindowStore();
        windows.openModal('remoteImport');
        windows.focusStack = [];
        expect(windows.topModal?.windowName).toBe('remoteImport');
        expect(windows.currentActiveWindow.windowName).toBe('remoteImport');
    });
});
