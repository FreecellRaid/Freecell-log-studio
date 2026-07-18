<template>
    <div
        v-if="mobileStore.activeBottomPanel"
        class="mobile-bottom-backdrop"
        @click.self="mobileStore.closeBottomPanel"
    >
        <section class="mobile-bottom-drawer">
            <div class="mobile-drawer-body">
                <ChunkListPanel
                    v-if="mobileStore.activeBottomPanel === 'chunkList'"
                />
                <IdentityPanel
                    v-else-if="mobileStore.activeBottomPanel === 'identity'"
                />
                <RuleEditorPanel
                    v-else-if="mobileStore.activeBottomPanel === 'ruleEditor'"
                />
                <SearchPanel
                    v-else-if="mobileStore.activeBottomPanel === 'search'"
                />
                <ExportFormatPanel
                    v-else-if="mobileStore.activeBottomPanel === 'exportFormat'"
                />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';

const ChunkListPanel = defineAsyncComponent(
    () => import('@/components/panels/ChunkListPanel.vue'),
);
const ExportFormatPanel = defineAsyncComponent(
    () => import('@/components/panels/ExportFormatPanel.vue'),
);
const IdentityPanel = defineAsyncComponent(
    () => import('@/components/panels/IdentityPanel.vue'),
);
const RuleEditorPanel = defineAsyncComponent(
    () => import('@/components/panels/RuleEditorPanel.vue'),
);
const SearchPanel = defineAsyncComponent(
    () => import('@/components/panels/SearchPanel.vue'),
);

const mobileStore = useMobileEditorStore();
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
