<template>
    <div class="main-workspace">
        <FileImporter v-if="isWorkspaceEmpty" />

        <template v-else>
            <component
                :is="viewComponent"
                v-if="activeViewInfo"
                :key="activeViewInfo.windowId"
                v-bind="viewProps"
            />
            <DefaultView v-else />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useWindowStore } from '@/stores/windowStore';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from '@/components/workspace/DefaultView.vue';

const logStore = useLogStore();
const windowStore = useWindowStore();
const isWorkspaceEmpty = computed(() => logStore.documents.length === 0);
const activeViewInfo = computed(() => windowStore.currentActiveView);

// 根据 windowName 映射组件
const viewComponent = computed(() => {
    if (!activeViewInfo.value) return DefaultView;

    const maps = {
        chunkView: ChunkView,
        exportPreview: ExportPreview,
        defaultView: DefaultView,
    };
    return (
        maps[activeViewInfo.value.windowName as keyof typeof maps] ||
        DefaultView
    );
});

// 动态传递 Props
const viewProps = computed(() => {
    if (!activeViewInfo.value) return {};

    if (activeViewInfo.value.windowName === 'chunkView') {
        return { chunkId: activeViewInfo.value.windowId };
    }
    if (activeViewInfo.value.windowName === 'exportPreview') {
        return { formatId: activeViewInfo.value.windowId };
    }
    return {};
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
