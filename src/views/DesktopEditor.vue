<template>
    <div class="ide-container">
        <TopMenuBar />

        <main class="middle-section">
            <aside class="sidebar-left">
                <SidebarLeft />
            </aside>

            <section class="workspace">
                <MainWorkspace />
            </section>

            <aside v-if="editorLayout.inspectorOpen" class="sidebar-right">
                <SidebarRight />
            </aside>
        </main>

        <footer class="status-bar">
            <StatusBar />
        </footer>
    </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/ui/layoutStore';

import { onMounted } from 'vue';
import { useKeyboardShortcuts } from '@/composables/interaction/useKeyboardShortcuts';
import { useScrollbarVisibility } from '@/composables/ui/useScrollbarVisibility';
import TopMenuBar from '@/components/desktop/TopMenuBar.vue';
import SidebarLeft from '@/components/desktop/SidebarLeft.vue';
import MainWorkspace from '@/components/desktop/MainWorkspace.vue';
import SidebarRight from '@/components/desktop/SidebarRight.vue';
import StatusBar from '@/components/desktop/StatusBar.vue';

const editorLayout = useLayoutStore();
useKeyboardShortcuts();
onMounted(() => {
    useScrollbarVisibility();
});
</script>
