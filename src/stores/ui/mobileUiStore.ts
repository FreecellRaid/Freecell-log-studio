import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { MobileOverlay, MobileSheetName } from '@/types/mobile';
import { useWindowStore } from '@/stores/ui/windowStore';

export const useMobileUiStore = defineStore('mobileUi', () => {
    const windowStore = useWindowStore();
    const activeOverlay = ref<MobileOverlay>(null);

    const leftDrawerOpen = computed(
        () => activeOverlay.value?.kind === 'leftDrawer',
    );
    const bottomPanelOpen = computed(() =>
        windowStore.isWindowOpen(windowStore.selectedLeftPanel),
    );
    const activeSheet = computed<MobileSheetName>(() =>
        activeOverlay.value?.kind === 'sheet'
            ? activeOverlay.value.sheet
            : null,
    );

    function openLeftDrawer() {
        windowStore.closeLeftPanel();
        activeOverlay.value = { kind: 'leftDrawer' };
    }

    function openBottomPanel() {
        activeOverlay.value = null;
        windowStore.openLeftPanel();
    }

    function toggleBottomPanel() {
        if (bottomPanelOpen.value) windowStore.closeLeftPanel();
        else openBottomPanel();
    }

    function openSheet(sheet: Exclude<MobileSheetName, null>) {
        windowStore.closeLeftPanel();
        activeOverlay.value = { kind: 'sheet', sheet };
    }

    function closeOverlay() {
        if (activeOverlay.value) activeOverlay.value = null;
        else windowStore.closeLeftPanel();
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
