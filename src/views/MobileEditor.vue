<template>
    <div
        class="mobile-editor"
        @touchstart="editorGesture.onTouchStart"
        @touchend="editorGesture.onTouchEnd"
        @touchcancel="editorGesture.onTouchCancel"
    >
        <HelpDocument v-if="windowStore.isWindowOpen('help')" />
        <MobileTopBar />
        <MobileWorkspace />
        <MobileHistoryFloat />
        <MobilePanelDock />
        <MobileBottomPanelDrawer v-if="mobileUiStore.bottomPanelOpen" />
        <MobileLeftDrawer v-if="mobileUiStore.leftDrawerOpen" />
        <MobileActiveSheet v-if="mobileUiStore.activeSheet" />
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onUnmounted } from 'vue';
import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useWindowStore } from '@/stores/ui/windowStore';
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
const mobileUiStore = useMobileUiStore();

const bottomPanelNames: MobileBottomPanelName[] = [
    'chunkList',
    'identity',
    'ruleEditor',
    'search',
    'exportFormat',
];

const editorGesture = useSwipeGesture([
    {
        direction: 'right',
        canStart: (event) =>
            !hasOpenOverlay() && event.touches[0].clientX <= 24,
        onSwipe: mobileUiStore.openLeftDrawer,
    },
    {
        direction: 'up',
        canStart: (event) =>
            !hasOpenOverlay() &&
            event.touches[0].clientY >= window.innerHeight - 72,
        onSwipe: () => {
            const activePanel = windowStore.selectedLeftPanel;
            const panel = bottomPanelNames.includes(
                activePanel as MobileBottomPanelName,
            )
                ? (activePanel as MobileBottomPanelName)
                : 'chunkList';
            windowStore.selectLeftPanel(panel);
            mobileUiStore.openBottomPanel();
        },
    },
]);

function hasOpenOverlay() {
    return Boolean(
        mobileUiStore.activeOverlay || windowStore.isWindowOpen('help'),
    );
}

onUnmounted(mobileUiStore.reset);
</script>
