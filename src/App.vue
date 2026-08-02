<template>
    <component
        :is="isMobile ? MobileEditor : Editor"
        :class="[{ 'dark-mode': uiStore.isDarkMode }]"
    />
</template>

<script setup lang="ts">
import Editor from './views/DesktopEditor.vue';
import MobileEditor from './views/MobileEditor.vue';
import { useUiStore } from './stores/ui/uiStore.js';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode.js';
import { onMounted } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';

const uiStore = useUiStore();
const { isMobile } = useResponsiveMode();
const windowStore = useWindowStore();
windowStore.initializeLayout(isMobile.value);

onMounted(() => {
    uiStore.initTheme();
});
</script>
