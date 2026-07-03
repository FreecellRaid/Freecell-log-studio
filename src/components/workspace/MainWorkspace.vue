<template>
    <FileImporter class="main-workspace">
        <div
            class="pane-layout"
            :class="{
                'pane-layout-vertical':
                    windowStore.paneDirection === 'vertical',
            }"
        >
            <template v-for="pane in workspacePanes" :key="pane.paneIndex">
                <div
                    class="workspace-pane"
                    :style="getPaneStyle(pane.paneIndex)"
                    @pointerdown.capture="handlePaneClick(pane.paneIndex)"
                >
                    <component
                        :is="getViewComponent(pane.instance?.windowName)"
                        v-if="pane.instance"
                        :key="pane.instance.windowId"
                        v-bind="getComponentProps(pane.instance)"
                    />
                    <DefaultView v-else />
                </div>

                <div
                    v-if="shouldRenderResizeHandle(pane.paneIndex)"
                    class="resize-handle pane-resize-handle"
                    :class="{
                        'resize-handle-y':
                            windowStore.paneDirection === 'vertical',
                        'resize-handle-x':
                            windowStore.paneDirection === 'horizontal',
                    }"
                    @mousedown="startResize"
                ></div>
            </template>
        </div>
    </FileImporter>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWindowStore } from '@/stores/windowStore';
import type { WindowInstance, WindowName } from '@/types/window';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from './DefaultView.vue';

const windowStore = useWindowStore();
const workspacePanes = computed(() => windowStore.workspacePanes);

const viewComponentMap: Partial<Record<WindowName, any>> = {
    chunkView: ChunkView,
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

// 根据 WindowName 获取对应的 Vue 组件
function getViewComponent(name?: WindowName) {
    if (!name) return DefaultView;
    return viewComponentMap[name] || DefaultView;
}

function getComponentProps(instance: WindowInstance) {
    return {
        windowId: instance.windowId,
        originalId: instance.originalId,
    };
}

function getPaneStyle(index: 0 | 1): Record<string, string> {
    const isHorizontal = windowStore.paneDirection === 'horizontal';
    const size =
        workspacePanes.value.length === 1 ? 100 : windowStore.paneSizes[index];

    return isHorizontal
        ? { width: `${size}%`, height: '100%' }
        : { width: '100%', height: `${size}%` };
}

function handlePaneClick(paneIndex: 0 | 1) {
    const pane = workspacePanes.value.find(
        (item) => item.paneIndex === paneIndex,
    );
    if (pane?.instance) {
        windowStore.setFocus(pane.instance.windowId);
    }
}

function shouldRenderResizeHandle(paneIndex: 0 | 1) {
    return paneIndex < workspacePanes.value.length - 1;
}

function startResize(e: MouseEvent) {
    e.preventDefault();
    const isHorizontal = windowStore.paneDirection === 'horizontal';
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const startSizes = [...windowStore.paneSizes];
    const containerSize = isHorizontal
        ? container.clientWidth
        : container.clientHeight;

    function onMouseMove(ev: MouseEvent) {
        const currentPos = isHorizontal ? ev.clientX : ev.clientY;
        const delta = currentPos - startPos;
        const deltaPercent = (delta / containerSize) * 100;

        // 限制最小/最大比例防止窗格消失 (20% - 80%)
        const newLeftSize = Math.min(
            80,
            Math.max(20, startSizes[0] + deltaPercent),
        );
        const newRightSize = 100 - newLeftSize;
        windowStore.paneSizes = [newLeftSize, newRightSize];
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
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

.pane-layout {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
}

.pane-layout.pane-layout-vertical {
    flex-direction: column;
}

.workspace-pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
}
</style>
