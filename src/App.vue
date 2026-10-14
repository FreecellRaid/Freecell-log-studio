<template>
    <div
        :inert="Boolean(windowStore.topModal)"
        :aria-hidden="windowStore.topModal ? true : undefined"
    >
        <component
            :is="isMobile ? MobileEditor : DesktopEditor"
            :class="[{ 'dark-mode': uiStore.isDarkMode }]"
        />
    </div>
    <ModalHost :class="[{ 'dark-mode': uiStore.isDarkMode }]" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted } from 'vue';
import { useUiStore } from './stores/ui/uiStore.js';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode.js';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useRemoteImportStore } from '@/stores/io/remoteImportStore.js';
import { useHistoryStore } from '@/stores/editor/historyStore';
import ModalHost from '@/components/modal/ModalHost.vue';

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
const historyStore = useHistoryStore();
windowStore.initializeLayout(isMobile.value);

onMounted(() => {
    uiStore.initTheme();
    window.addEventListener('hashchange', importFromLocation);
    importFromLocation();
    // 有未保存修改时拦截刷新/关闭，交由浏览器弹出确认
    window.addEventListener('beforeunload', handleBeforeUnload);
});
onUnmounted(() => {
    window.removeEventListener('hashchange', importFromLocation);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    remoteImport.cancel();
});

function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!historyStore.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
}
</script>
