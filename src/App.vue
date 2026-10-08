<template>
    <component
        :is="isMobile ? MobileEditor : DesktopEditor"
        :class="[{ 'dark-mode': uiStore.isDarkMode }]"
    />
    <RemoteImportDialog />
</template>

<script setup lang="ts">
import { useUiStore } from './stores/ui/uiStore.js';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode.js';
import { defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';

import RemoteImportDialog from '@/components/common/RemoteImportDialog.vue';
import { useRemoteImportStore } from '@/stores/ui/remoteImportStore';

const remoteImport = useRemoteImportStore();
function importFromLocation() {
    const hash = window.location.hash;
    if (
        hash.startsWith('#2-') ||
        new URLSearchParams(hash.slice(1)).has('source')
    ) {
        void remoteImport.importLink(window.location.href);
    } else {
        remoteImport.close();
    }
}

const DesktopEditor = defineAsyncComponent(
    () => import('./views/DesktopEditor.vue'),
);
const MobileEditor = defineAsyncComponent(
    () => import('./views/MobileEditor.vue'),
);

const uiStore = useUiStore();
const { isMobile } = useResponsiveMode();
const windowStore = useWindowStore();
windowStore.initializeLayout(isMobile.value);

onMounted(() => {
    uiStore.initTheme();
    window.addEventListener('hashchange', importFromLocation);
    importFromLocation();
});
onUnmounted(() => {
    window.removeEventListener('hashchange', importFromLocation);
    remoteImport.cancel();
});
</script>
