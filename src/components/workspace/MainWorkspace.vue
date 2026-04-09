<template>
    <div class="main-workspace">
        <FileImporter v-if="isWorkspaceEmpty" />

        <template v-else>
            <ExportPreview v-if="uiStore.exportPreviewVisible" />
            <template v-else>
                <ChunkView
                    v-if="uiStore.activeChunkId"
                    :chunk-id="uiStore.activeChunkId"
                />
                <DefaultView v-else />
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useUiStore } from '@/stores/uiStore';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from '@/components/workspace/DefaultView.vue';

const logStore = useLogStore();
const uiStore = useUiStore();
const isWorkspaceEmpty = computed(() => {
    return logStore.documents.length === 0;
});
</script>

<style scoped>
.main-workspace {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--bg-workspace);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
</style>
