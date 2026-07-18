<template>
    <div
        class="mobile-editor"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchCancel"
    >
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
import { useSwipeGesture } from '@/composables/useSwipeGesture';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useWindowStore } from '@/stores/windowStore';
import type { MobileBottomPanelName } from '@/types/mobile';

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

const bottomPanelNames: MobileBottomPanelName[] = [
    'chunkList',
    'identity',
    'ruleEditor',
    'search',
    'exportFormat',
];

const openLeftDrawerGesture = useSwipeGesture({
    direction: 'right',
    canStart: (event) => !hasOpenOverlay() && event.touches[0].clientX <= 24,
    onSwipe: mobileStore.openLeftDrawer,
});
const openBottomDrawerGesture = useSwipeGesture({
    direction: 'up',
    canStart: (event) =>
        !hasOpenOverlay() &&
        event.touches[0].clientY >= window.innerHeight - 72,
    onSwipe: () => {
        const activePanel = windowStore.activeLeftPanelName;
        const panel = bottomPanelNames.includes(
            activePanel as MobileBottomPanelName,
        )
            ? (activePanel as MobileBottomPanelName)
            : 'chunkList';
        mobileStore.openBottomPanel(panel);
        windowStore.setLeftPanel(panel);
    },
});

function hasOpenOverlay() {
    return Boolean(
        mobileStore.leftDrawerOpen ||
        mobileStore.activeBottomPanel ||
        mobileStore.activeSheet ||
        windowStore.isHelpOpen,
    );
}

function handleTouchStart(event: TouchEvent) {
    openLeftDrawerGesture.onTouchStart(event);
    openBottomDrawerGesture.onTouchStart(event);
}

function handleTouchEnd(event: TouchEvent) {
    openLeftDrawerGesture.onTouchEnd(event);
    openBottomDrawerGesture.onTouchEnd(event);
}

function handleTouchCancel() {
    openLeftDrawerGesture.onTouchCancel();
    openBottomDrawerGesture.onTouchCancel();
}
</script>
