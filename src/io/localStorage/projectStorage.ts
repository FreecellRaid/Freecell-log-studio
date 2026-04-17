import type { ProjectFile, StoredProjectsIndex } from '@/types/project';
import { normalizeProjectFile } from './project';

export const PROJECTS_STORAGE_KEY = 'freecell-log-studio.projects';

export interface SaveProjectResult {
    success: boolean;
    removedCount: number;
}

function isQuotaExceededError(error: unknown): boolean {
    return (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
}

function sortProjectsByNewest(projects: ProjectFile[]): ProjectFile[] {
    return [...projects].sort((a, b) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
}

function writeProjects(projects: ProjectFile[]) {
    const payload: StoredProjectsIndex = {
        projects,
    };

    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(payload));
}

export function loadStoredProjects(): ProjectFile[] {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as StoredProjectsIndex;
        if (!parsed || !Array.isArray(parsed.projects)) {
            return [];
        }

        const validProjects = parsed.projects
            .map((project) => {
                try {
                    return normalizeProjectFile(project);
                } catch {
                    return null;
                }
            })
            .filter((project): project is ProjectFile => project !== null);

        return sortProjectsByNewest(validProjects);
    } catch {
        return [];
    }
}

export function saveProjectToLocalStorage(
    project: ProjectFile,
): SaveProjectResult {
    const existingProjects = loadStoredProjects();
    const filteredProjects = existingProjects.filter(
        (item) => item.projectId !== project.projectId,
    );
    let nextProjects = sortProjectsByNewest([project, ...filteredProjects]);
    let removedCount = 0;

    while (true) {
        try {
            writeProjects(nextProjects);
            return {
                success: true,
                removedCount,
            };
        } catch (error) {
            if (!isQuotaExceededError(error) || nextProjects.length === 0) {
                return {
                    success: false,
                    removedCount,
                };
            }

            nextProjects = [...nextProjects]
                .sort(
                    (a, b) =>
                        new Date(a.time).getTime() - new Date(b.time).getTime(),
                )
                .slice(1);
            removedCount++;
        }
    }
}

export function deleteProjectFromLocalStorage(projectId: string): boolean {
    const existingProjects = loadStoredProjects();
    const nextProjects = existingProjects.filter(
        (project) => project.projectId !== projectId,
    );

    if (nextProjects.length === existingProjects.length) {
        return false;
    }

    writeProjects(nextProjects);
    return true;
}
