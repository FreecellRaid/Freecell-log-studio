<template>
    <main class="mobile-main">
        <WorkspaceView :instance="windowStore.lastFocusedView" />
    </main>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/ui/windowStore';
import WorkspaceView from '@/components/workspace/WorkspaceView.vue';

const windowStore = useWindowStore();
</script>

<style scoped>
.mobile-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(58px + env(safe-area-inset-bottom));
}
</style>
