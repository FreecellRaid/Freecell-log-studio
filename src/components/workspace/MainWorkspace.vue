<template>
    <div class="main-workspace">
        <FileImporter v-if="isWorkspaceEmpty" />
        <template v-else>
            <div
                class="split-container"
                :class="{
                    'split-vertical': windowStore.splitDirection === 'vertical',
                }"
            >
                <template v-for="pane in workspacePanes" :key="pane.paneIndex">
                    <div
                        class="split-pane"
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
                        class="split-resize-handle"
                        :class="{
                            'resize-vertical':
                                windowStore.splitDirection === 'vertical',
                        }"
                        @mousedown="startResize"
                    ></div>
                </template>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useWindowStore } from '@/stores/windowStore';
import type { WindowInstance, WindowName } from '@/types/window';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from './DefaultView.vue';

const logStore = useLogStore();
const windowStore = useWindowStore();
const isWorkspaceEmpty = computed(() => logStore.documents.length === 0);
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
    const isHorizontal = windowStore.splitDirection === 'horizontal';
    const size =
        workspacePanes.value.length === 1 ? 100 : windowStore.splitSizes[index];

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
    const isHorizontal = windowStore.splitDirection === 'horizontal';
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const startSizes = [...windowStore.splitSizes];
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
        windowStore.splitSizes = [newLeftSize, newRightSize];
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

.split-container {
    display: flex;
    width: 100%;
    height: 100%;
}

.split-container.split-vertical {
    flex-direction: column;
}

.split-pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
}

.split-resize-handle {
    width: 4px;
    height: 100%;
    cursor: col-resize;
    flex-shrink: 0;
    background-color: transparent;
    transition: background-color 0.15s;
    z-index: 10;
}

.split-resize-handle:hover,
.split-resize-handle:active {
    background-color: var(--active-accent);
}

.split-container.split-vertical .split-resize-handle {
    width: 100%;
    height: 4px;
    cursor: row-resize;
}
</style>
