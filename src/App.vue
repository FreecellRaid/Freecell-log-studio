<template>
    <component
        :is="isMobile ? MobileEditor : DesktopEditor"
        :class="[{ 'dark-mode': uiStore.isDarkMode }]"
    />
</template>

<script setup lang="ts">
import { useUiStore } from './stores/ui/uiStore.js';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode.js';
import { defineAsyncComponent, onMounted } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';

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
});
</script>
