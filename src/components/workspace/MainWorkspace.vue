<template>
    <div class="main-workspace">
        <FileImporter v-if="isWorkspaceEmpty" />
        <template v-else-if="windowStore.splitMode === 'single'">
            <component
                :is="viewComponent"
                v-if="activeViewInfo"
                :key="activeViewInfo.windowId"
                v-bind="getViewProps(activeViewInfo)"
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
                        :is="getViewComponentByType(leftPane.viewType)"
                        v-if="leftPane"
                        :key="leftPane.windowId"
                        v-bind="getPaneViewProps(leftPane)"
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
                        :is="getViewComponentByType(rightPane.viewType)"
                        v-if="rightPane"
                        :key="rightPane.windowId"
                        v-bind="getPaneViewProps(rightPane)"
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
import type { SplitPaneState } from '@/types/layout';
import FileImporter from '@/components/common/FileImporter.vue';
import ChunkView from './ChunkView.vue';
import ExportPreview from './ExportPreview.vue';
import DefaultView from './DefaultView.vue';

const logStore = useLogStore();
const windowStore = useWindowStore();
const isWorkspaceEmpty = computed(() => logStore.documents.length === 0);
const activeViewInfo = computed(() => windowStore.currentActiveView);

// 分屏 pane 数据
const leftPane = computed<SplitPaneState>(() => windowStore.splitPanes[0]);
const rightPane = computed<SplitPaneState | null>(
    () => windowStore.splitPanes[1],
);

// 分屏尺寸（百分比）
const splitSizes = ref<[number, number]>([50, 50]);

// 视图类型到组件的映射
const viewComponentMap: Record<string, any> = {
    chunkView: ChunkView,
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

// 单视图模式：获取当前组件
const viewComponent = computed(() => {
    if (!activeViewInfo.value) return DefaultView;
    return viewComponentMap[activeViewInfo.value.windowName] || DefaultView;
});

// 根据类型获取组件
function getViewComponentByType(viewType: string) {
    return viewComponentMap[viewType] || DefaultView;
}

// 单视图模式：获取 props
function getViewProps(viewInfo: { windowName: string; windowId: string }) {
    if (viewInfo.windowName === 'chunkView') {
        return { chunkId: viewInfo.windowId, windowId: viewInfo.windowId };
    }
    if (viewInfo.windowName === 'exportPreview') {
        return { formatId: viewInfo.windowId, windowId: viewInfo.windowId };
    }
    return {};
}

// 分屏模式：获取 pane 的 props
function getPaneViewProps(pane: SplitPaneState) {
    if (pane.viewType === 'chunkView') {
        return { chunkId: pane.viewId, windowId: pane.windowId };
    }
    if (pane.viewType === 'exportPreview') {
        return { formatId: pane.viewId, windowId: pane.windowId };
    }
    return {};
}

// 获取 pane 的样式（宽度/高度）
function getPaneStyle(index: 0 | 1): Record<string, string> {
    const isHorizontal = windowStore.splitDirection === 'horizontal';
    const size = splitSizes.value[index];
    if (isHorizontal) {
        return { width: `${size}%`, height: '100%' };
    } else {
        return { width: '100%', height: `${size}%` };
    }
}

// 处理 pane 点击（确保焦点切换到该 pane 内的视图）
function handlePaneClick(paneIndex: 0 | 1) {
    const pane = paneIndex === 0 ? leftPane.value : rightPane.value;
    if (pane) {
        windowStore.setFocus(pane.windowId);
    }
}

// 拖拽调整分隔条
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

        let newLeftSize = Math.min(
            80,
            Math.max(20, startSizes[0] + deltaPercent),
        );
        const newRightSize = 100 - newLeftSize;

        splitSizes.value = [newLeftSize, newRightSize];
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

/* 分屏容器 */
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

/* 分隔条 */
.split-resize-handle {
    width: 4px;
    height: 100%;
    cursor: col-resize;
    flex-shrink: 0;
    transition: background-color 0.15s;
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
