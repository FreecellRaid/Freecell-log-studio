import { computed } from 'vue';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useWindowStore } from '@/stores/windowStore';
import type { ProjectFile } from '@/types/project';
import { useFilter } from './useFilter';
import {
    buildProjectFile,
    sanitizeProjectFilename,
} from '@/io/localStorage/project';
import {
    deleteProjectFromLocalStorage,
    loadStoredProjects,
    saveProjectToLocalStorage,
} from '@/io/localStorage/projectStorage';

function downloadProjectJson(project: ProjectFile) {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${sanitizeProjectFilename(project.projectName)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function useProjectManager() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const clipboardStore = useClipboardStore();
    const historyStore = useHistoryStore();
    const windowStore = useWindowStore();
    const filterTool = useFilter();

    const hasWorkspaceState = computed(() => {
        return (
            logStore.documents.length > 0 ||
            styleStore.rules.length > 0 ||
            clipboardStore.copiedMessages.length > 0 ||
            filterTool.hasSelection.value ||
            historyStore.undoStack.length > 0 ||
            historyStore.redoStack.length > 0
        );
    });

    function createCurrentProjectFile() {
        const time = new Date().toISOString();
        const project = buildProjectFile({
            projectId: logStore.projectId,
            projectName: logStore.projectName,
            time,
            documents: logStore.documents,
            colorRules: styleStore.rules,
            viewSettings: styleStore.viewSettings,
        });

        logStore.setProjectTime(time);
        return project;
    }

    function replaceWorkspaceWithProject(
        project: ProjectFile,
        options: { confirmIfNeeded?: boolean } = {},
    ) {
        const shouldConfirm =
            options.confirmIfNeeded !== false && hasWorkspaceState.value;

        if (
            shouldConfirm &&
            !window.confirm(
                '当前编辑区有内容，导入工程会覆盖当前工作区，是否继续？',
            )
        ) {
            return false;
        }

        logStore.replaceDocuments(project.documents);
        logStore.setProjectMeta({
            projectId: project.projectId,
            projectName: project.projectName,
            projectTime: project.time,
            isProjectNameCustomized: true,
        });
        styleStore.replaceRules(project.colorRules);
        styleStore.replaceViewSettings(project.viewSettings);
        clipboardStore.clearClipboard();
        filterTool.clearSelection();
        historyStore.clearHistory();
        windowStore.focusStack = [];

        return true;
    }

    function saveCurrentProjectToLocal() {
        const project = createCurrentProjectFile();
        return saveProjectToLocalStorage(project);
    }

    function exportCurrentProject() {
        const project = createCurrentProjectFile();
        downloadProjectJson(project);
    }

    function getStoredProjects() {
        return loadStoredProjects();
    }

    function openStoredProject(projectId: string) {
        const targetProject = loadStoredProjects().find(
            (project) => project.projectId === projectId,
        );

        if (!targetProject) {
            throw new Error('未找到对应的本地工程');
        }

        return replaceWorkspaceWithProject(targetProject, {
            confirmIfNeeded: true,
        });
    }

    function deleteStoredProject(projectId: string) {
        return deleteProjectFromLocalStorage(projectId);
    }

    return {
        hasWorkspaceState,
        createCurrentProjectFile,
        replaceWorkspaceWithProject,
        saveCurrentProjectToLocal,
        exportCurrentProject,
        getStoredProjects,
        openStoredProject,
        deleteStoredProject,
    };
}
