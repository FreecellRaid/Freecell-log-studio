<template>
    <FileImporter class="main-workspace">
        <div
            class="pane-layout"
            :class="{
                'pane-layout-vertical':
                    editorWorkspace.direction === 'vertical',
            }"
        >
            <template
                v-for="(pane, index) in workspacePanes"
                :key="pane.paneId"
            >
                <div class="workspace-pane" :style="getPaneStyle(index)">
                    <WorkspaceView :pane="pane" />
                </div>

                <div
                    v-if="index < workspacePanes.length - 1"
                    class="resize-handle pane-resize-handle"
                    :class="{
                        'resize-handle-y':
                            editorWorkspace.direction === 'vertical',
                        'resize-handle-x':
                            editorWorkspace.direction === 'horizontal',
                    }"
                    @mousedown="startResize"
                ></div>
            </template>
        </div>
    </FileImporter>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';

import { computed, onUnmounted } from 'vue';
import FileImporter from '@/components/desktop/FileImporter.vue';
import WorkspaceView from '@/components/workspace/WorkspaceView.vue';

const editorWorkspace = useWorkspaceStore();
const workspacePanes = computed(() => editorWorkspace.panes);
let stopResize: (() => void) | null = null;
onUnmounted(() => stopResize?.());

function getPaneStyle(index: number): Record<string, string> {
    const isHorizontal = editorWorkspace.direction === 'horizontal';
    const size =
        workspacePanes.value.length === 1
            ? 100
            : index === 0
              ? editorWorkspace.ratio
              : 100 - editorWorkspace.ratio;

    return isHorizontal
        ? { width: `${size}%`, height: '100%' }
        : { width: '100%', height: `${size}%` };
}

function startResize(e: MouseEvent) {
    e.preventDefault();
    stopResize?.();
    const isHorizontal = editorWorkspace.direction === 'horizontal';
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;

    const startPos = isHorizontal ? e.clientX : e.clientY;
    const startRatio = editorWorkspace.ratio;
    const containerSize = isHorizontal
        ? container.clientWidth
        : container.clientHeight;
    if (containerSize <= 0) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    function onMouseMove(ev: MouseEvent) {
        const currentPos = isHorizontal ? ev.clientX : ev.clientY;
        const delta = currentPos - startPos;
        const deltaPercent = (delta / containerSize) * 100;

        // 限制最小/最大比例防止窗格消失 (20% - 80%)
        const newLeftSize = Math.min(
            80,
            Math.max(20, startRatio + deltaPercent),
        );
        editorWorkspace.setRatio(newLeftSize);
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        stopResize = null;
    }

    stopResize = onMouseUp;
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
