<template>
    <div class="popover">
        <div class="stored-projects-toolbar">
            <span>本地工程</span>
            <button
                class="icon-interactive"
                type="button"
                :disabled="loading || busy"
                @click="refreshStoredProjects"
                title="刷新列表"
            >
                <RefreshCcw class="ui-icon" aria-hidden="true" />
            </button>
        </div>
        <div v-if="loading" class="stored-projects-empty" role="status">
            正在读取本地工程…
        </div>
        <div v-else-if="error" class="stored-projects-empty" role="alert">
            {{ error }}
        </div>
        <div
            v-for="warning in warnings"
            :key="warning"
            class="stored-projects-empty"
            role="status"
        >
            {{ warning }}
        </div>
        <div
            v-if="!loading && !error && projects.length === 0"
            class="stored-projects-empty"
        >
            当前没有已保存的本地工程
        </div>
        <div
            v-for="project in projects"
            :key="project.projectId"
            class="stored-project-item"
            @click="handleOpenStoredProject(project.projectId)"
        >
            <div class="stored-project-main">
                <div class="stored-project-name">
                    {{ project.projectName || '未命名工程' }}
                </div>
                <div class="stored-project-meta">
                    {{ formatStoredProjectTime(project.time) }} ·
                    {{ project.documentCount }} 文档
                </div>
            </div>
            <div class="stored-project-actions">
                <button
                    class="icon-interactive icon-button-warning"
                    type="button"
                    :disabled="busy || projectManager.storageState.isSaving"
                    title="删除工程"
                    @click.stop="handleDeleteStoredProject(project.projectId)"
                >
                    <Trash2 class="ui-icon" aria-hidden="true" />
                </button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { RefreshCcw, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { formatDate } from '@/utils/date';
import type { StoredProjectSummary } from '@/io/storage/projectStorage';
import { useProjectManager } from '@/composables/application/useProjectManager';

defineProps<{
    projects: StoredProjectSummary[];
    loading: boolean;
    error: string;
    warnings: string[];
}>();

const emit = defineEmits<{
    refresh: [];
    close: [];
}>();

const projectManager = useProjectManager();
const busy = ref(false);

function refreshStoredProjects() {
    emit('refresh');
}

async function handleOpenStoredProject(projectId: string) {
    if (busy.value || projectManager.storageState.isSaving) return;
    busy.value = true;
    try {
        if (await projectManager.openStoredProject(projectId)) {
            refreshStoredProjects();
            emit('close');
        }
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '打开本地工程失败');
    } finally {
        busy.value = false;
    }
}

async function handleDeleteStoredProject(projectId: string) {
    if (busy.value || projectManager.storageState.isSaving) return;
    if (!window.confirm('确定要删除这个工程文件吗？本操作不可撤销。')) {
        return;
    }

    busy.value = true;
    try {
        const deleted = await projectManager.deleteStoredProject(projectId);
        if (!deleted) {
            alert('未找到对应的本地工程。');
            return;
        }
        refreshStoredProjects();
    } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '删除本地工程失败');
    } finally {
        busy.value = false;
    }
}

function formatStoredProjectTime(time: string) {
    return formatDate(new Date(time));
}
</script>
<style scoped>
.popover {
    width: 280px;
    max-height: 400px;
    overflow-y: auto;
    padding-top: 10px;
    box-shadow: 0 4px 12px var(--box-shadow);
}

.stored-projects-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 10px;
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
    padding: 10px 12px;
    font-size: 12px;
    color: var(--text-muted);
}

.stored-project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-top: none;
}
.stored-project-item:hover {
    background-color: var(--hover-bg);
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
