<template>
    <div class="mobile-editor">
        <HelpDocument v-if="windowStore.isHelpOpen" />
        <MobileTopBar />
        <MobileWorkspace />
        <MobileHistoryFloat />
        <MobilePanelDock />
        <MobileBottomPanelDrawer />
        <MobileLeftDrawer />
        <MobileActiveSheet />
    </div>
</template>

<script setup lang="ts">
import HelpDocument from '@/components/common/HelpDocument.vue';
import MobileActiveSheet from '@/components/mobile/MobileActiveSheet.vue';
import MobileBottomPanelDrawer from '@/components/mobile/MobileBottomPanelDrawer.vue';
import MobileHistoryFloat from '@/components/mobile/MobileHistoryFloat.vue';
import MobileLeftDrawer from '@/components/mobile/MobileLeftDrawer.vue';
import MobilePanelDock from '@/components/mobile/MobilePanelDock.vue';
import MobileTopBar from '@/components/mobile/MobileTopBar.vue';
import MobileWorkspace from '@/components/mobile/MobileWorkspace.vue';
import { useWindowStore } from '@/stores/windowStore';

const windowStore = useWindowStore();
</script>

<style scoped>
.mobile-editor {
    width: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text-primary);
    background: var(--bg-workspace);
}
</style>
