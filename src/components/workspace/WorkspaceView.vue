<template>
    <component
        :is="viewComponent"
        :key="view?.windowId ?? 'defaultView'"
        :window-id="view?.windowId ?? 'defaultView'"
        :original-id="view ? getWindowTargetId(view) : 'defaultView'"
    />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import {
    getWindowTargetId,
    isWorkspaceView,
    type WindowInstance,
} from '@/types/window';

const props = defineProps<{ instance: WindowInstance | null }>();
const ChunkView = defineAsyncComponent(() => import('./ChunkView.vue'));
const ExportPreview = defineAsyncComponent(() => import('./ExportPreview.vue'));
const DefaultView = defineAsyncComponent(() => import('./DefaultView.vue'));

const view = computed(() =>
    props.instance && isWorkspaceView(props.instance) ? props.instance : null,
);
const viewComponent = computed(() => {
    switch (view.value?.windowName) {
        case 'chunkView':
            return ChunkView;
        case 'exportPreview':
            return ExportPreview;
        default:
            return DefaultView;
    }
});
</script>
