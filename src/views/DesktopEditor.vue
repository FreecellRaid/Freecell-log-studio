<template>
    <div class="ide-container">
        <TopMenuBar />
        <HelpDocument v-if="windowStore.isWindowOpen('help')" />

        <main class="middle-section">
            <aside class="sidebar-left">
                <SidebarLeft />
            </aside>

            <section class="workspace">
                <MainWorkspace />
            </section>

            <aside
                v-if="windowStore.isWindowOpen('inspector')"
                class="sidebar-right"
            >
                <SidebarRight />
            </aside>
        </main>

        <footer class="status-bar">
            <StatusBar />
        </footer>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useKeyboardShortcuts } from '@/composables/interaction/useKeyboardShortcuts';
import { useScrollbarVisibility } from '@/composables/ui/useScrollbarVisibility';
import HelpDocument from '@/components/common/HelpDocument.vue';
import TopMenuBar from '@/components/desktop/TopMenuBar.vue';
import SidebarLeft from '@/components/desktop/SidebarLeft.vue';
import MainWorkspace from '@/components/desktop/MainWorkspace.vue';
import SidebarRight from '@/components/desktop/SidebarRight.vue';
import StatusBar from '@/components/desktop/StatusBar.vue';

const windowStore = useWindowStore();
useKeyboardShortcuts();
onMounted(() => {
    useScrollbarVisibility();
});
</script>
