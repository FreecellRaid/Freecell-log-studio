import { readonly, ref } from 'vue';
import { defineStore } from 'pinia';
import type { LeftPanel } from '@/types/editorLayout';

export const useLayoutStore = defineStore('layout', () => {
    const sidebarOpen = ref(false);
    const activePanel = ref<LeftPanel>('chunkList');
    const inspectorOpen = ref(false);
    let initialized = false;
    function initialize(isMobile: boolean) {
        if (initialized) return;
        initialized = true;
        sidebarOpen.value = !isMobile;
    }
    function selectPanel(panel: LeftPanel) {
        activePanel.value = panel;
    }
    function openPanel(panel = activePanel.value) {
        selectPanel(panel);
        sidebarOpen.value = true;
    }
    function closePanel() {
        sidebarOpen.value = false;
    }
    function togglePanel() {
        sidebarOpen.value = !sidebarOpen.value;
    }
    function openInspector() {
        inspectorOpen.value = true;
    }
    function closeInspector() {
        inspectorOpen.value = false;
    }
    function toggleInspector() {
        inspectorOpen.value = !inspectorOpen.value;
    }
    return {
        sidebarOpen: readonly(sidebarOpen),
        activePanel: readonly(activePanel),
        inspectorOpen: readonly(inspectorOpen),
        initialize,
        selectPanel,
        openPanel,
        closePanel,
        togglePanel,
        openInspector,
        closeInspector,
        toggleInspector,
    };
});
