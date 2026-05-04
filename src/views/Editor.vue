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
import { useWindowStore } from '@/stores/windowStore';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import HelpDocument from '@/components/common/HelpDocument.vue';
import TopMenuBar from '@/components/layout/TopMenuBar.vue';
import SidebarLeft from '@/components/layout/SidebarLeft.vue';
import MainWorkspace from '@/components/workspace/MainWorkspace.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
import SidebarRight from '@/components/layout/SidebarRight.vue';

const windowStore = useWindowStore();
useKeyboardShortcuts();
</script>
