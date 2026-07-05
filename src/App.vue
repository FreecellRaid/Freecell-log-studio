<template>
    <component
        :is="isMobile ? MobileEditor : Editor"
        :class="[{ 'dark-mode': uiStore.isDarkMode }]"
    />
</template>

<script setup lang="ts">
import Editor from './views/Editor.vue';
import MobileEditor from './views/MobileEditor.vue';
import { useUiStore } from './stores/uiStore';
import { useResponsiveMode } from '@/composables/useResponsiveMode';
import { onMounted } from 'vue';

const uiStore = useUiStore();
const { isMobile } = useResponsiveMode();

onMounted(() => {
    uiStore.initTheme();
});
</script>
