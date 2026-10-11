<template>
    <main class="mobile-main">
        <component
            :is="getWorkspaceComponent(mobileWorkspaceAdapter, visibleView)"
            :key="visibleView?.windowId ?? 'defaultView'"
            v-bind="getWorkspaceProps(visibleView)"
        />
    </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWindowStore } from '@/stores/ui/windowStore';
import { selectMobileView } from '@/windows/selectMobileView';
import {
    mobileWorkspaceAdapter,
    getWorkspaceComponent,
    getWorkspaceProps,
} from '@/windows/workspaceAdapters';

const windowStore = useWindowStore();
const visibleView = computed(() =>
    selectMobileView(windowStore.openWindows, windowStore.focusStack),
);
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
