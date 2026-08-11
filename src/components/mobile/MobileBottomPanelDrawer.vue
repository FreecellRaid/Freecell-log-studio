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
                    v-if="windowStore.selectedLeftPanel === 'chunkList'"
                />
                <IdentityPanel
                    v-else-if="windowStore.selectedLeftPanel === 'identity'"
                />
                <RuleEditorPanel
                    v-else-if="windowStore.selectedLeftPanel === 'ruleEditor'"
                />
                <SearchPanel
                    v-else-if="windowStore.selectedLeftPanel === 'search'"
                />
                <ExportFormatPanel
                    v-else-if="windowStore.selectedLeftPanel === 'exportFormat'"
                />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import IdentityPanel from '@/components/panels/IdentityPanel.vue';
import RuleEditorPanel from '@/components/panels/RuleEditorPanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';

const mobileUiStore = useMobileUiStore();
const windowStore = useWindowStore();
const closeGesture = useSwipeGesture({
    direction: 'down',
    canStart: (event) => {
        const target = event.target;
        const body =
            target instanceof Element
                ? target.closest('.mobile-drawer-body')
                : null;
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

.mobile-drawer-body :deep(.panel-header),
.mobile-drawer-body :deep(.header-title) {
    min-height: 44px;
}
</style>
