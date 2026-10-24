<template>
    <div
        v-if="mobileUiStore.bottomPanelOpen"
        class="mobile-bottom-backdrop"
        @click.self="mobileUiStore.closeOverlay"
        @touchstart="closeGesture.onTouchStart"
        @touchend="closeGesture.onTouchEnd"
        @touchcancel="closeGesture.onTouchCancel"
    >
        <section class="mobile-bottom-drawer">
            <div class="mobile-drawer-body">
                <ChunkListPanel
                    v-if="editorLayout.activePanel === 'chunkList'"
                />
                <ColoringPanel
                    v-else-if="editorLayout.activePanel === 'coloring'"
                />
                <SearchPanel
                    v-else-if="editorLayout.activePanel === 'search'"
                />
                <ExportFormatPanel
                    v-else-if="editorLayout.activePanel === 'exportFormat'"
                />
                <ResourcePanel
                    v-else-if="editorLayout.activePanel === 'resources'"
                />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/ui/layoutStore';

import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import ColoringPanel from '@/components/panels/ColoringPanel.vue';
import ResourcePanel from '@/components/panels/ResourcePanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';

const mobileUiStore = useMobileUiStore();
const editorLayout = useLayoutStore();
const closeGesture = useSwipeGesture({
    direction: 'down',
    canStart: (event) => {
        const target = event.target;
        const body =
            target instanceof Element
                ? target.closest('.mobile-drawer-body')
                : null;
        const scrollableList =
            target instanceof Element
                ? target.closest(
                      '.resource-list, .coloring-panel .panel-block-list',
                  )
                : null;
        if (
            scrollableList instanceof HTMLElement &&
            scrollableList.scrollTop > 0
        )
            return false;
        return !(body instanceof HTMLElement) || body.scrollTop === 0;
    },
    onSwipe: mobileUiStore.closeOverlay,
});
</script>

<style scoped>
.mobile-bottom-backdrop {
    z-index: 100;
    align-items: flex-end;
}

.mobile-bottom-drawer {
    width: 100%;
    max-height: min(78dvh, 720px);
    overflow: hidden;
    background: var(--bg-workspace);
    border-radius: 8px 8px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -8px 30px var(--box-shadow);
}

.mobile-drawer-body {
    height: min(68dvh, 640px);
    overflow: auto;
}

.mobile-drawer-body :deep(.panel) {
    height: auto;
    min-height: min(68dvh, 640px);
}

.mobile-drawer-body :deep(.panel-header) {
    height: 46px;
    box-sizing: border-box;
    padding: 0 12px;
}

.mobile-drawer-body :deep(.header-title) {
    margin-top: 0;
}

.mobile-drawer-body :deep(.resource-panel) {
    height: min(68dvh, 640px);
    min-height: 0;
}
.mobile-drawer-body :deep(.coloring-panel) {
    height: 100%;
    min-height: 0;
}

.mobile-drawer-body :deep(.coloring-section) {
    height: auto;
    min-height: 0;
}

.mobile-drawer-body :deep(.coloring-section > .panel-header) {
    height: auto;
    padding: 8px 12px;
}
</style>
