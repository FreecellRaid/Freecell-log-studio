<template>
    <div
        class="mobile-editor"
        @touchstart="editorGesture.onTouchStart"
        @touchend="editorGesture.onTouchEnd"
        @touchcancel="editorGesture.onTouchCancel"
    >
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
import { useDialogStore } from '@/stores/ui/dialogStore';

import { useLayoutStore } from '@/stores/ui/layoutStore';

import { onUnmounted } from 'vue';
import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import type { MobileBottomPanelName } from '@/types/mobile';
import MobileActiveSheet from '@/components/mobile/MobileActiveSheet.vue';
import MobileBottomPanelDrawer from '@/components/mobile/MobileBottomPanelDrawer.vue';
import MobileHistoryFloat from '@/components/mobile/MobileHistoryFloat.vue';
import MobileLeftDrawer from '@/components/mobile/MobileLeftDrawer.vue';
import MobilePanelDock from '@/components/mobile/MobilePanelDock.vue';
import MobileTopBar from '@/components/mobile/MobileTopBar.vue';
import MobileWorkspace from '@/components/mobile/MobileWorkspace.vue';

const navigation = useEditorNavigation();
const editorDialogs = useDialogStore();
const editorLayout = useLayoutStore();
const mobileUiStore = useMobileUiStore();

const bottomPanelNames: MobileBottomPanelName[] = [
    'chunkList',
    'coloring',
    'search',
    'resources',
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
            const activePanel = editorLayout.activePanel;
            const panel = bottomPanelNames.includes(
                activePanel as MobileBottomPanelName,
            )
                ? (activePanel as MobileBottomPanelName)
                : 'chunkList';
            navigation.selectPanel(panel);
            mobileUiStore.openBottomPanel();
        },
    },
]);

function hasOpenOverlay() {
    return Boolean(mobileUiStore.activeOverlay || editorDialogs.top);
}

onUnmounted(mobileUiStore.reset);
</script>
