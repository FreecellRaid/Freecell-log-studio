<template>
    <div
        class="file-importer"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        :class="{ 'is-dragging': isDragging }"
    >
        <div class="drop-zone">
            <div class="icon-container">
                <FolderOpen class="ui-icon icon" />
            </div>
            <h2 class="title">导入跑团 Log</h2>
            <p class="subtitle">将文件拖拽到此处，或点击</p>

            <button class="browse-btn" @click="triggerFileInput">
                导入文件
            </button>
            <input
                type="file"
                ref="fileInput"
                @change="handleFileSelect"
                accept=".txt,.json,.html"
                multiple
                hidden
            />

            <div class="shortcuts-hint">
                <div class="shortcut-item">
                    <span>切换侧边栏</span>
                    <span>Ctrl + B</span>
                </div>
                <div class="shortcut-item">
                    <span>打开帮助文档</span>
                    <span>Ctrl + K</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FolderOpen } from '@lucide/vue';
import { ref } from 'vue';
import { useFileImport } from '@/composables/useImporter';

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const { importAndApply } = useFileImport();

function triggerFileInput() {
    if (fileInput.value) {
        fileInput.value.click();
    }
}

async function handleDrop(event: DragEvent) {
    isDragging.value = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        await processFiles(Array.from(files));
    }
}

async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        await processFiles(Array.from(files));
    }
    // 清空 input 值，允许重复导入相同名称的文件
    if (fileInput.value) {
        fileInput.value.value = '';
    }
}

async function processFiles(files: File[]) {
    try {
        await importAndApply(files);
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '解析文件时发生错误');
    }
}
</script>

<style scoped>
.file-importer {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-workspace);
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.file-importer.is-dragging {
    background-color: var(--selection-bg);
    border: 2px dashed var(--active-accent);
}

.drop-zone {
    text-align: center;
    max-width: 400px;
}

.icon-container .icon {
    width: 64px;
    height: 64px;
    opacity: 0.6;
    color: var(--icon-color);
}

.title {
    font-size: 20px;
    margin: 16px 0 8px;
    color: var(--text-primary);
}

.subtitle {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 24px;
}

.browse-btn {
    background-color: var(--active-accent);
    color: var(--bg-workspace);
    border: none;
    padding: 8px 24px;
    border-radius: 4px;
    cursor: pointer;
}

.browse-btn:hover {
    opacity: 0.9;
}

.shortcuts-hint {
    margin-top: 32px;
    font-size: 12px;
    color: var(--text-muted);
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    padding: 4px 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
}
</style>
