<template>
    <component
        :is="viewComponent"
        :key="viewKey"
        :pane-id="pane.paneId"
        :original-id="originalId"
    />
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { WorkspacePane } from '@/types/editorLayout';
const props = defineProps<{ pane: WorkspacePane }>();
const ChunkView = defineAsyncComponent(() => import('./ChunkView.vue'));
const ExportPreview = defineAsyncComponent(() => import('./ExportPreview.vue'));
const DefaultView = defineAsyncComponent(() => import('./DefaultView.vue'));
const originalId = computed(() =>
    props.pane.view.kind === 'scene'
        ? props.pane.view.chunkId
        : props.pane.view.kind === 'preview'
          ? props.pane.view.formatId
          : '',
);
// 视图内容切换时重建组件，窗格自身的身份保持稳定。
const viewKey = computed(
    () => `${props.pane.paneId}:${props.pane.view.kind}:${originalId.value}`,
);
const viewComponent = computed(() =>
    props.pane.view.kind === 'scene'
        ? ChunkView
        : props.pane.view.kind === 'preview'
          ? ExportPreview
          : DefaultView,
);
</script>
