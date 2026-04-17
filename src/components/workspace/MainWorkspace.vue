<template>
    <div class="main-workspace">
        <FileImporter v-if="isWorkspaceEmpty" />
        <template v-else-if="windowStore.splitMode === 'single'">
            <component
                :is="getViewComponent(currentActiveView.windowName)"
                v-if="currentActiveView"
                :key="currentActiveView.windowId"
                v-bind="getComponentProps(currentActiveView)"
            />
            <DefaultView v-else />
        </template>

        <template v-else>
            <div
                class="split-container"
                :class="{
                    'split-vertical': windowStore.splitDirection === 'vertical',
                }"
            >
                <div
                    class="split-pane"
                    :style="getPaneStyle(0)"
                    @pointerdown.capture="handlePaneClick(0)"
                >
                    <component
                        :is="getViewComponent(leftPane.windowName)"
                        v-if="leftPane"
                        :key="leftPane.windowId"
                        v-bind="getComponentProps(leftPane)"
                    />
                </div>

                <div
                    v-if="rightPane"
                    class="split-resize-handle"
                    :class="{
                        'resize-vertical':
                            windowStore.splitDirection === 'vertical',
                    }"
                    @mousedown="startResize"
                ></div>

                <div
                    class="split-pane"
                    :style="getPaneStyle(1)"
                    @pointerdown.capture="handlePaneClick(1)"
                >
                    <component
                        :is="getViewComponent(rightPane.windowName)"
                        v-if="rightPane"
                        :key="rightPane.windowId"
                        v-bind="getComponentProps(rightPane)"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useWindowStore } from '@/stores/windowStore';
import type { WindowInstance, WindowName } from '@/types/layout';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from './DefaultView.vue';

const logStore = useLogStore();
const windowStore = useWindowStore();
const isWorkspaceEmpty = computed(() => logStore.documents.length === 0);
const currentActiveView = computed(() => windowStore.currentActiveView);

// 分屏数据映射
const leftPane = computed(() => windowStore.splitPanes[0]);
const rightPane = computed(() => windowStore.splitPanes[1]);

const splitSizes = ref<[number, number]>(windowStore.splitSizes);

const viewComponentMap: Partial<Record<WindowName, any>> = {
    chunkView: ChunkView,
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

// 根据 WindowName 获取对应的 Vue 组件
function getViewComponent(name: WindowName) {
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
    const size = splitSizes.value[index];

    return isHorizontal
        ? { width: `${size}%`, height: '100%' }
        : { width: '100%', height: `${size}%` };
}

function handlePaneClick(paneIndex: 0 | 1) {
    const pane = paneIndex === 0 ? leftPane.value : rightPane.value;
    if (pane) {
        windowStore.setFocus(pane.windowId);
    }
}

function startResize(e: MouseEvent) {
    e.preventDefault();
    const isHorizontal = windowStore.splitDirection === 'horizontal';
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const startSizes = [...splitSizes.value];
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

        splitSizes.value = [newLeftSize, newRightSize];
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
