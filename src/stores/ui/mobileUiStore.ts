import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { MobileOverlay, MobileSheetName } from '@/types/mobile';

export const useMobileUiStore = defineStore('mobileUi', () => {
    const activeOverlay = ref<MobileOverlay>(null);

    const leftDrawerOpen = computed(
        () => activeOverlay.value?.kind === 'leftDrawer',
    );
    const bottomPanelOpen = computed(
        () => activeOverlay.value?.kind === 'bottomPanel',
    );
    const activeSheet = computed<MobileSheetName>(() =>
        activeOverlay.value?.kind === 'sheet'
            ? activeOverlay.value.sheet
            : null,
    );

    function openLeftDrawer() {
        activeOverlay.value = { kind: 'leftDrawer' };
    }

    function openBottomPanel() {
        activeOverlay.value = { kind: 'bottomPanel' };
    }

    function toggleBottomPanel() {
        activeOverlay.value = bottomPanelOpen.value
            ? null
            : { kind: 'bottomPanel' };
    }

    function openSheet(sheet: Exclude<MobileSheetName, null>) {
        activeOverlay.value = { kind: 'sheet', sheet };
    }

    function closeOverlay() {
        activeOverlay.value = null;
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
