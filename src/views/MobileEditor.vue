<template>
    <div class="mobile-editor">
        <HelpDocument v-if="windowStore.isHelpOpen" />
        <MobileTopBar />
        <MobileWorkspace />
        <MobileHistoryFloat />
        <MobilePanelDock />
        <MobileBottomPanelDrawer v-if="mobileStore.activeBottomPanel" />
        <MobileLeftDrawer v-if="mobileStore.leftDrawerOpen" />
        <MobileActiveSheet v-if="mobileStore.activeSheet" />
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useWindowStore } from '@/stores/windowStore';

const HelpDocument = defineAsyncComponent(
    () => import('@/components/common/HelpDocument.vue'),
);
const MobileActiveSheet = defineAsyncComponent(
    () => import('@/components/mobile/MobileActiveSheet.vue'),
);
const MobileBottomPanelDrawer = defineAsyncComponent(
    () => import('@/components/mobile/MobileBottomPanelDrawer.vue'),
);
const MobileHistoryFloat = defineAsyncComponent(
    () => import('@/components/mobile/MobileHistoryFloat.vue'),
);
const MobileLeftDrawer = defineAsyncComponent(
    () => import('@/components/mobile/MobileLeftDrawer.vue'),
);
const MobilePanelDock = defineAsyncComponent(
    () => import('@/components/mobile/MobilePanelDock.vue'),
);
const MobileTopBar = defineAsyncComponent(
    () => import('@/components/mobile/MobileTopBar.vue'),
);
const MobileWorkspace = defineAsyncComponent(
    () => import('@/components/mobile/MobileWorkspace.vue'),
);

const windowStore = useWindowStore();
const mobileStore = useMobileEditorStore();
</script>
