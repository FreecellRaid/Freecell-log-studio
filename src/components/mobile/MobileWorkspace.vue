<template>
    <main class="mobile-main">
        <WorkspaceView :pane="editorWorkspace.activePane" />
    </main>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';

import WorkspaceView from '@/components/workspace/WorkspaceView.vue';

const editorWorkspace = useWorkspaceStore();
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
