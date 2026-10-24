import { useLayoutStore } from '@/stores/ui/layoutStore';
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { MobileOverlay, MobileSheetName } from '@/types/mobile';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';

export const useMobileUiStore = defineStore('mobileUi', () => {
    const navigation = useEditorNavigation();
    const editorLayout = useLayoutStore();
    const activeOverlay = ref<MobileOverlay>(null);

    const leftDrawerOpen = computed(
        () => activeOverlay.value?.kind === 'leftDrawer',
    );
    const bottomPanelOpen = computed(() => editorLayout.sidebarOpen);
    const activeSheet = computed<MobileSheetName>(() =>
        activeOverlay.value?.kind === 'sheet'
            ? activeOverlay.value.sheet
            : null,
    );

    function openLeftDrawer() {
        navigation.closePanel();
        activeOverlay.value = { kind: 'leftDrawer' };
    }

    function openBottomPanel() {
        activeOverlay.value = null;
        navigation.openPanel();
    }

    function toggleBottomPanel() {
        if (bottomPanelOpen.value) navigation.closePanel();
        else openBottomPanel();
    }

    function openSheet(sheet: Exclude<MobileSheetName, null>) {
        navigation.closePanel();
        activeOverlay.value = { kind: 'sheet', sheet };
    }

    function closeOverlay() {
        if (activeOverlay.value) activeOverlay.value = null;
        else navigation.closePanel();
    }

    function reset() {
        activeOverlay.value = null;
    }

    return {
        activeOverlay,
        leftDrawerOpen,
        bottomPanelOpen,
        activeSheet,
        openLeftDrawer,
        openBottomPanel,
        toggleBottomPanel,
        openSheet,
        closeOverlay,
        reset,
    };
});
