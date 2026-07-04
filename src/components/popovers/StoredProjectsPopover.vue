<template>
    <div class="stored-projects-panel">
        <div class="stored-projects-toolbar">
            <span>本地工程</span>
            <button
                class="icon-interactive"
                type="button"
                @click="refreshStoredProjects"
                title="刷新列表"
            >
                <RefreshCcw class="ui-icon" aria-hidden="true" />
            </button>
        </div>
        <div v-if="storedProjects.length === 0" class="stored-projects-empty">
            当前没有已保存的本地工程
        </div>
        <div
            v-for="project in storedProjects"
            :key="project.projectId"
            class="stored-project-item"
        >
            <div class="stored-project-main">
                <div class="stored-project-name">
                    {{ project.projectName || '未命名工程' }}
                </div>
                <div class="stored-project-meta">
                    {{ formatStoredProjectTime(project.time) }} ·
                    {{ project.documents.length }} 文档
                </div>
            </div>
            <div class="stored-project-actions">
                <button
                    class="icon-interactive"
                    type="button"
                    title="打开工程"
                    @click="handleOpenStoredProject(project.projectId)"
                >
                    <FolderOpen class="ui-icon" aria-hidden="true" />
                </button>
                <button
                    class="icon-interactive icon-button-warning"
                    type="button"
                    title="删除工程"
                    @click="handleDeleteStoredProject(project.projectId)"
                >
                    <Trash2 class="ui-icon" aria-hidden="true" />
                </button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { formatDate } from '@/utils/date';
import type { ProjectFile } from '@/types/project';
import { useProjectManager } from '@/composables/useProjectManager';

const projectManager = useProjectManager();
const storedProjects = ref<ProjectFile[]>([]);

function refreshStoredProjects() {
    storedProjects.value = projectManager.getStoredProjects();
}

function handleOpenStoredProject(projectId: string) {
    try {
        if (projectManager.openStoredProject(projectId)) {
            refreshStoredProjects();
        }
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '打开本地工程失败');
    }
}

function handleDeleteStoredProject(projectId: string) {
    if (!window.confirm('确定要删除这个工程文件吗？本操作不可撤销。')) {
        return;
    }

    try {
        const deleted = projectManager.deleteStoredProject(projectId);
        if (!deleted) {
            alert('未找到对应的本地工程。');
            return;
        }
        refreshStoredProjects();
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '删除本地工程失败');
    }
}

function formatStoredProjectTime(time: string) {
    return formatDate(new Date(time));
}
</script>
<style scoped>
.stored-projects-panel {
    width: 280px;
    box-sizing: border-box;
    max-height: 400px;
    overflow-y: auto;
    padding: 10px 12px;
    color: var(--text-primary);
    background: var(--bg-topbar);
    box-shadow: 0 4px 12px var(--box-shadow);
}

.stored-projects-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--text-muted);
}

.stored-projects-toolbar > button,
.stored-project-actions > button {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
}

.stored-projects-empty {
    padding: 10px 0;
    font-size: 12px;
    color: var(--text-muted);
}

.stored-project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
    border-top: none;
}

.stored-project-main {
    min-width: 0;
}

.stored-project-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stored-project-meta {
    margin-top: 4px;
    font-size: 11px;
    color: var(--text-muted);
}

.stored-project-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}
</style>
