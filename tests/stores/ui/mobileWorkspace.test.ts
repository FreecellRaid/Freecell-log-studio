import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';

beforeEach(() => setActivePinia(createPinia()));

describe('shared mobile workspace', () => {
    it('shows the active pane through tool and dialog interaction', () => {
        const workspace = useWorkspaceStore();
        const navigation = useEditorNavigation();
        navigation.showScene('scene');
        const sceneId = workspace.activePaneId;
        navigation.showPreview('standard');
        const previewId = workspace.activePaneId;
        navigation.activatePane(sceneId);
        navigation.openPanel('search');
        useDialogStore().open('help');
        expect(workspace.activePaneId).toBe(sceneId);
        useDialogStore().closeTop();
        navigation.activatePane(previewId);
        expect(workspace.activePane.view).toEqual({
            kind: 'preview',
            formatId: 'standard',
        });
        navigation.closePane(previewId);
        expect(workspace.activePaneId).toBe(sceneId);
        navigation.closePane(sceneId);
        expect(workspace.activePane.view.kind).toBe('empty');
    });

    it('uses layout state for the bottom panel and keeps mobile overlays exclusive', () => {
        const mobile = useMobileUiStore();
        const layout = useLayoutStore();
        layout.selectPanel('resources');
        mobile.openBottomPanel();
        expect(mobile.bottomPanelOpen).toBe(true);
        expect(layout.activePanel).toBe('resources');
        mobile.openLeftDrawer();
        expect(mobile.leftDrawerOpen).toBe(true);
        expect(mobile.bottomPanelOpen).toBe(false);
        mobile.openBottomPanel();
        expect(mobile.leftDrawerOpen).toBe(false);
        mobile.openSheet('message');
        expect(mobile.activeSheet).toBe('message');
        expect(mobile.bottomPanelOpen).toBe(false);
        mobile.closeOverlay();
        expect(mobile.activeOverlay).toBeNull();
    });

    it('initializes layout once and preserves desktop split state on mobile projection', () => {
        const layout = useLayoutStore();
        const workspace = useWorkspaceStore();
        layout.initialize(true);
        layout.initialize(false);
        expect(layout.sidebarOpen).toBe(false);
        workspace.showScene('left');
        workspace.splitPane({ kind: 'scene', chunkId: 'right' });
        const before = JSON.stringify(workspace.panes);
        const activeId = workspace.activePane.paneId;
        useMobileUiStore().openBottomPanel();
        expect(JSON.stringify(workspace.panes)).toBe(before);
        expect(workspace.activePane.paneId).toBe(activeId);
    });
});
