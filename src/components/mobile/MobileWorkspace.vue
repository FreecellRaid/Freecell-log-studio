<template>
    <main class="mobile-main">
        <MobileChunkView v-if="activeChunk" :active-chunk="activeChunk" />
        <MobileDefaultView v-else />
    </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileChunkView from '@/components/mobile/MobileChunkView.vue';
import MobileDefaultView from '@/components/mobile/MobileDefaultView.vue';
import { useLogStore } from '@/stores/project/logStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import type { Chunk } from '@/types/log';

const logStore = useLogStore();
const windowStore = useWindowStore();

const activeChunk = computed<Chunk | null>(() => {
    const currentView = windowStore.currentActiveView;
    if (currentView.windowName === 'chunkView') {
        return logStore.findChunkById(currentView.originalId);
    }

    return logStore.allChunks[0] ?? null;
});
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
