import type { ProjectFile as WorkspaceProject } from '@/types/project';
import type { ProjectFile } from '@/types/projectFile';
import { generateId } from '@/utils/id';
import { migrateProjectFileTo, restoreMessageFilter } from './projectFile';

// 临时桥接现有编辑器运行时。图片资源接入前明确拒绝，不能打开后保存成无图工程。
export function projectFileToWorkspace(file: ProjectFile): WorkspaceProject {
    if (
        Object.keys(file.resources).length ||
        file.documents.some((doc) =>
            doc.chunks.some((chunk) =>
                chunk.messages.some((message) => message.images.length),
            ),
        )
    ) {
        throw new Error(
            '此工程包含图片资源，当前编辑器尚未接入图片资源层，不能打开以免丢失图片。',
        );
    }
    if (file.styleRules.some((rule) => rule.filter.hasImage !== undefined)) {
        throw new Error('此工程包含图片筛选规则，需在图片功能接入后打开。');
    }
    return {
        version: 2,
        projectId: file.projectId,
        projectName: file.projectName,
        time: file.time,
        documents: file.documents.map((doc) => ({
            ...doc,
            chunks: doc.chunks.map((chunk) => ({
                ...chunk,
                messages: chunk.messages.map(
                    ({ images: _images, ...message }) => ({
                        ...message,
                        time: new Date(message.time),
                    }),
                ),
            })),
        })),
        styleRules: file.styleRules.map((rule) => ({
            ...rule,
            filter: restoreMessageFilter(rule.filter),
        })),
        viewSettings: { ...file.viewSettings },
    };
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
