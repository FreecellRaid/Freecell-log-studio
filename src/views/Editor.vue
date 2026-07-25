<template>
    <div class="ide-container">
        <TopMenuBar />
        <HelpDocument v-if="windowStore.isHelpOpen" />

        <main class="middle-section">
            <aside class="sidebar-left">
                <SidebarLeft />
            </aside>

            <section class="workspace">
                <MainWorkspace />
            </section>

            <aside v-if="windowStore.rightSidebarVisible" class="sidebar-right">
                <SidebarRight />
            </aside>
        </main>

        <footer class="status-bar">
            <StatusBar />
        </footer>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { useScrollbarVisibility } from '@/composables/useScrollbarVisibility';
import TopMenuBar from '@/components/desktop/TopMenuBar.vue';
import SidebarLeft from '@/components/desktop/SidebarLeft.vue';
import MainWorkspace from '@/components/desktop/MainWorkspace.vue';
import StatusBar from '@/components/desktop/StatusBar.vue';

const HelpDocument = defineAsyncComponent(
    () => import('@/components/common/HelpDocument.vue'),
);
const SidebarRight = defineAsyncComponent(
    () => import('@/components/desktop/SidebarRight.vue'),
);

const windowStore = useWindowStore();
useKeyboardShortcuts();
onMounted(() => {
    useScrollbarVisibility();
});
</script>
