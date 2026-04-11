<template>
    <div class="ide-container">
        <TopMenuBar />
        <HelpDocument v-if="uiStore.isHelpOpen" />

        <main class="middle-section">
            <aside class="sidebar-left">
                <SidebarLeft />
            </aside>

            <section class="workspace">
                <MainWorkspace />
            </section>

            <aside v-if="uiStore.rightSidebarVisible" class="sidebar-right">
                <SidebarRight />
            </aside>
        </main>

        <footer class="status-bar">
            <StatusBar />
        </footer>

        <HelpDocument
            v-if="uiStore.helpDocumentVisible"
            @close="uiStore.closeHelpDocument"
        />
    </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import HelpDocument from '@/components/common/HelpDocument.vue';
import TopMenuBar from '@/components/layout/TopMenuBar.vue';
import SidebarLeft from '@/components/layout/SidebarLeft.vue';
import MainWorkspace from '@/components/workspace/MainWorkspace.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
import SidebarRight from '@/components/layout/SidebarRight.vue';
import HelpDocument from '@/components/common/HelpDocument.vue';
import { useProjectManager } from '@/composables/useProjectManager';

const uiStore = useUiStore();
useKeyboardShortcuts();
</script>

<style scoped>
.ide-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}
</style>
