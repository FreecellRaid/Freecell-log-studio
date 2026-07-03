<template>
    <div
        class="file-importer"
        :class="{ 'is-file-dragging': isFileDragging }"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
    >
        <slot />

        <div v-if="isFileDragging" class="workspace-drop-overlay">
            <div class="drop-overlay-content">
                <FolderOpen class="ui-icon" />
                <span>松开鼠标导入文件</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FolderOpen } from '@lucide/vue';
import { useFileImport } from '@/composables/useImporter';

const { importAndApply } = useFileImport();
const isFileDragging = ref(false);
const fileDragDepth = ref(0);

function hasFileTransfer(event: DragEvent) {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
}

function resetFileDragging() {
    isFileDragging.value = false;
    fileDragDepth.value = 0;
}

function handleDragEnter(event: DragEvent) {
    if (!hasFileTransfer(event)) return;
    event.preventDefault();
    fileDragDepth.value += 1;
    isFileDragging.value = true;
}

function handleDragOver(event: DragEvent) {
    if (!hasFileTransfer(event)) return;
    event.preventDefault();
    isFileDragging.value = true;
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
    }
}

function handleDragLeave(event: DragEvent) {
    if (!hasFileTransfer(event)) return;
    event.preventDefault();
    fileDragDepth.value = Math.max(0, fileDragDepth.value - 1);
    if (fileDragDepth.value === 0) {
        isFileDragging.value = false;
    }
}

async function handleDrop(event: DragEvent) {
    if (!hasFileTransfer(event)) return;
    event.preventDefault();
    const files = event.dataTransfer?.files;
    resetFileDragging();

    if (!files || files.length === 0) return;

    try {
        await importAndApply(Array.from(files));
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '解析文件时发生错误');
    }
}
</script>

<style scoped>
.file-importer {
    position: relative;
}

.workspace-drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    background: var(--selection-bg);
    border: 2px dashed var(--active-accent);
    opacity: 0.7;
}

.drop-overlay-content {
    display: inline-flex;
    align-items: center;
    color: var(--active-accent);
    font-size: 14px;
    font-weight: 600;
}

.drop-overlay-content .ui-icon {
    width: 18px;
    height: 18px;
}
</style>
