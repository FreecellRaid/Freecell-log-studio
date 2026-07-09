<template>
    <div class="popover">
        <div class="export-item" @click="handleCopyText">导出到剪切板</div>
        <div class="export-item" @click="handleExportText">导出为 TEXT</div>
        <div class="export-item" @click="handleExportHtml">导出为 HTML</div>
        <!-- <div class="export-item" @click="handleExportDoc">导出为 DOC</div> -->
        <div class="export-item" @click="handleExportDocx">导出为 DOCX</div>
        <div class="export-item" @click="handleExportProject">
            导出为工程文件
        </div>
    </div>
</template>
<script setup lang="ts">
import { useExport } from '@/composables/useExporter';
import { useProjectManager } from '@/composables/useProjectManager';
const projectManager = useProjectManager();

const {
    exportAsText,
    exportAsHtml,
    // exportAsDoc,
    exportAsDocx,
    copyExportToClipboard,
} = useExport();
async function handleCopyText() {
    try {
        await copyExportToClipboard();
        alert('已复制导出内容到剪切板');
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '复制导出时发生错误');
    }
}

async function handleExportText() {
    try {
        await exportAsText();
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '导出TXT时发生错误');
    }
}
async function handleExportHtml() {
    try {
        await exportAsHtml();
    } catch (error) {
        console.error(error);
        alert('导出 HTML 时发生错误');
    }
}

// async function handleExportDoc() {
//     try {
//         await exportAsDoc();
//     } catch (error) {
//         console.error(error);
//         alert('导出 Doc 时发生错误');
//     }
// }

async function handleExportDocx() {
    try {
        await exportAsDocx();
    } catch (error) {
        console.error(error);
        alert('导出 Docx 时发生错误');
    }
}

function handleExportProject() {
    try {
        projectManager.exportCurrentProject();
    } catch (error) {
        console.error(error);
        alert(
            error instanceof Error ? error.message : '导出工程文件时发生错误',
        );
    }
}
</script>
<style scoped>
.popover {
    width: 160px;
    box-shadow: 0 4px 12px var(--box-shadow);
}

.export-item {
    padding: 10px 16px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    white-space: nowrap;
}

.export-item:hover {
    background: var(--hover-bg);
    color: var(--icon-color-strong);
}
</style>
