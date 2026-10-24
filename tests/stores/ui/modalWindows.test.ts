import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useCommandDispatcher } from '@/composables/application/useCommandDispatcher';
import { useSearchStore } from '@/stores/editor/searchStore';
import { useRemoteImportStore } from '@/stores/io/remoteImportStore';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('independent modal lifecycle', () => {
    it('raises singleton dialogs without depending on workspace focus', () => {
        const dialogs = useDialogStore();
        const navigation = useEditorNavigation();
        navigation.showScene('scene');
        const background = { ...useCommandContextStore().current };
        dialogs.open('help');
        dialogs.open('remoteImport');
        navigation.openPanel();
        expect(useCommandContextStore().current).toEqual(background);
        dialogs.open('help');
        expect(dialogs.stack).toEqual(['remoteImport', 'help']);
        dialogs.closeTop();
        expect(dialogs.top).toBe('remoteImport');
        dialogs.closeTop();
        expect(dialogs.isBlocking).toBe(false);
    });

    it('blocks background commands and cancels only the top dialog', () => {
        const dialogs = useDialogStore();
        const layout = useLayoutStore();
        const { dispatch } = useCommandDispatcher();
        dialogs.open('help');
        useRemoteImportStore().open();
        dispatch('toggleLeft');
        expect(layout.sidebarOpen).toBe(false);
        dispatch('cancel');
        expect(dialogs.top).toBe('help');
        dispatch('cancel');
        expect(dialogs.top).toBeNull();
        dispatch('toggleLeft');
        expect(layout.sidebarOpen).toBe(true);
    });

    it('opens search repeatedly without resetting its text and respects dialog blocking', () => {
        const dialogs = useDialogStore();
        const layout = useLayoutStore();
        const search = useSearchStore();
        const { dispatch } = useCommandDispatcher();
        search.quickSearch = '保留关键词';
        dispatch('openSearch');
        expect(layout.activePanel).toBe('search');
        expect(search.focusRequested).toBe(true);
        search.focusRequested = false;
        dispatch('openSearch');
        expect(search.focusRequested).toBe(true);
        expect(search.quickSearch).toBe('保留关键词');
        useEditorNavigation().closePanel();
        dialogs.open('help');
        dispatch('openSearch');
        expect(layout.sidebarOpen).toBe(false);
    });
});
