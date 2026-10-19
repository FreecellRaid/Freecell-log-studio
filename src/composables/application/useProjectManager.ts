import { computed } from 'vue';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import type { ProjectFile } from '@/types/project';
import { useActiveContext } from '@/composables/application/useActiveContext';
import {
    buildProjectFile,
    sanitizeProjectFilename,
} from '@/io/storage/project';
import { projectRepository } from '@/io/storage/projectStorage';
import {
    migrateProjectFileTo,
    stringifyProjectFile,
} from '@/io/storage/projectFile';
import { projectFileToWorkspace } from '@/io/storage/workspaceProject';
import { useProjectStorageStore } from '@/stores/io/projectStorageStore';
import type { ProjectFile as SerializedProject } from '@/types/projectFile';

// 不同按钮及快捷键共用队列，先发起的保存不能覆盖后发起的快照。
let saveQueue: Promise<unknown> = Promise.resolve();

function downloadProjectJson(project: SerializedProject) {
    const blob = new Blob([stringifyProjectFile(project)], {
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
    const activeContext = useActiveContext();
    const storageState = useProjectStorageStore();

    const hasWorkspaceState = computed(() => {
        return (
            logStore.documents.length > 0 ||
            styleStore.rules.length > 0 ||
            clipboardStore.copiedMessages.length > 0 ||
            activeContext.hasSelection.value ||
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
            styleRules: styleStore.rules,
            viewSettings: styleStore.viewSettings,
        });

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
        styleStore.replaceRules(project.styleRules);
        styleStore.replaceViewSettings(project.viewSettings);
        clipboardStore.clearClipboard();
        activeContext.clearSelection();
        historyStore.clearHistory();
        windowStore.pruneOrphanChunkViews((id) =>
            Boolean(logStore.findChunkById(id)),
        );
        windowStore.focusStack = [];
        windowStore.setFocus(windowStore.currentActiveView.windowId);

        return true;
    }

    async function saveCurrentProjectToLocal() {
        const project = migrateProjectFileTo(
            createCurrentProjectFile(),
        ).project;
        const checkpoint = historyStore.createSaveCheckpoint();
        const documents = logStore.documents;
        storageState.pendingSaves++;
        const operation = saveQueue
            .catch(() => undefined)
            .then(async () => {
                await storageState.initialize();
                await projectRepository.save(project);
                // 保存的是调用时的快照；异步期间的新修改仍然未保存。
                if (
                    logStore.projectId === project.projectId &&
                    logStore.documents === documents
                ) {
                    logStore.setProjectTime(project.time);
                    historyStore.markSaved(checkpoint);
                }
            });
        saveQueue = operation;
        try {
            await operation;
        } finally {
            storageState.pendingSaves--;
        }
    }

    function exportCurrentProject() {
        const project = migrateProjectFileTo(
            createCurrentProjectFile(),
        ).project;
        downloadProjectJson(project);
    }

    async function getStoredProjects() {
        await storageState.initialize();
        return projectRepository.list();
    }

    async function openStoredProject(projectId: string) {
        const targetProject = await projectRepository.get(projectId);

        if (!targetProject) {
            throw new Error('未找到对应的本地工程');
        }

        return replaceWorkspaceWithProject(
            projectFileToWorkspace(targetProject),
            {
                confirmIfNeeded: true,
            },
        );
    }

    function deleteStoredProject(projectId: string) {
        return projectRepository.delete(projectId);
    }

    return {
        hasWorkspaceState,
        storageState,
        createCurrentProjectFile,
        replaceWorkspaceWithProject,
        saveCurrentProjectToLocal,
        exportCurrentProject,
        getStoredProjects,
        openStoredProject,
        deleteStoredProject,
    };
}
