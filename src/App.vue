<template>
    <Editor :class="['ide-container', { 'dark-mode': uiStore.isDarkMode }]" />
</template>

<script setup lang="ts">
import Editor from './views/Editor.vue';
import { useUiStore } from './stores/uiStore';
import {useScrollbarVisibility} from "@/composables/useScrollbarVisibility";
import { onMounted} from 'vue';
const uiStore = useUiStore();
onMounted(() => {
    useScrollbarVisibility();
});

</script>
