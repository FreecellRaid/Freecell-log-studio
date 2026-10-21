import { collectDocumentResourceIds } from '@/editor/resourceReferences';
import type { WorkspaceProject } from '@/types/project';
import type { ProjectFile } from '@/types/projectFile';
import { generateId } from '@/utils/id';
import { migrateProjectFileTo, restoreMessageFilter } from './projectFile';

// 文件中的 Blob 在资源仓库恢复，运行时消息仅持有附件引用。
export function projectFileToWorkspace(file: ProjectFile): WorkspaceProject {
    return {
        projectId: file.projectId,
        projectName: file.projectName,
        time: file.time,
        documents: file.documents.map((doc) => ({
            ...doc,
            chunks: doc.chunks.map((chunk) => ({
                ...chunk,
                messages: chunk.messages.map((message) => ({
                    ...message,
                    images: message.images.map((image) => ({ ...image })),
                    time: new Date(message.time),
                })),
            })),
        })),
        styleRules: file.styleRules.map((rule) => ({
            ...rule,
            filter: restoreMessageFilter(rule.filter),
        })),
        viewSettings: { ...file.viewSettings },
        resources: file.resources,
    };
}

export function workspaceProjectToFile(
    workspace: WorkspaceProject,
): ProjectFile {
    const resources = { ...workspace.resources };
    for (const id of collectDocumentResourceIds(workspace.documents))
        resources[id] ??= { type: 'image' };
    return migrateProjectFileTo(
        JSON.parse(
            JSON.stringify(
                {
                    ...workspace,
                    schema: 'freecell-project',
                    version: 3,
                    resources,
                    documents: workspace.documents.map((doc) => ({
                        ...doc,
                        chunks: doc.chunks.map((chunk) => ({
                            ...chunk,
                            messages: chunk.messages.map((message) => ({
                                ...message,
                                images: message.images ?? [],
                            })),
                        })),
                    })),
                },
                (_key, value: unknown) =>
                    value instanceof RegExp
                        ? {
                              type: 'regexp',
                              source: value.source,
                              flags: value.flags,
                          }
                        : value,
            ),
        ),
    ).project;
}

export function tryReadWorkspaceProject(text: string): WorkspaceProject | null {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    if (
        !('documents' in value) &&
        !('schema' in value && value.schema === 'freecell-project')
    )
        return null;
    const { project } = migrateProjectFileTo(value);
    const runtime = projectFileToWorkspace(project);
    runtime.projectId = generateId();
    return runtime;
}
