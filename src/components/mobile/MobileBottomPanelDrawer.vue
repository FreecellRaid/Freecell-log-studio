<template>
    <div class="mobile-bottom-backdrop" @click.self="$emit('close')">
        <section class="mobile-bottom-drawer">
            <div class="mobile-drawer-body">
                <ChunkListPanel v-if="activePanel === 'chunkList'" />
                <IdentityPanel v-else-if="activePanel === 'identity'" />
                <RuleEditorPanel v-else-if="activePanel === 'ruleEditor'" />
                <SearchPanel v-else-if="activePanel === 'search'" />
                <ExportFormatPanel v-else-if="activePanel === 'exportFormat'" />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import ChunkListPanel from '@/components/panels/ChunkListPanel.vue';
import ExportFormatPanel from '@/components/panels/ExportFormatPanel.vue';
import IdentityPanel from '@/components/panels/IdentityPanel.vue';
import RuleEditorPanel from '@/components/panels/RuleEditorPanel.vue';
import SearchPanel from '@/components/panels/SearchPanel.vue';
import type { MobileBottomPanelName } from '@/types/mobile';

defineProps<{
    activePanel: MobileBottomPanelName;
    title: string;
}>();

defineEmits<{
    (e: 'close'): void;
}>();
</script>

<style scoped>
.mobile-bottom-backdrop {
    position: fixed;
    inset: 0;
    background: var(--box-shadow);
    z-index: 100;
    display: flex;
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
