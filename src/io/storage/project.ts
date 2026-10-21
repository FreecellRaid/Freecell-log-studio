import { cloneLogMetadata } from '@/utils/logMetadata';
import type { StyleRule, ViewSettings } from '@/types/style';
import type { LogDocument, MessageFilter, RoleType } from '@/types/log';
import { isRoleType } from '@/types/log';
import type { WorkspaceProject } from '@/types/project';

function isRoleTypeArray(value: unknown): value is RoleType[] {
    return Array.isArray(value) && value.every(isRoleType);
}

function cloneFilterValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return [...value] as T;
    }

    if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags) as T;
    }

    if (value instanceof Date) {
        return new Date(value.getTime()) as T;
    }

    return value;
}

function cloneMessageFilter(filter: MessageFilter): MessageFilter {
    const clonedFilter: MessageFilter = {};

    if (filter.messageId !== undefined) {
        clonedFilter.messageId = cloneFilterValue(filter.messageId);
    }
    if (filter.chunkId !== undefined) {
        clonedFilter.chunkId = cloneFilterValue(filter.chunkId);
    }
    if (filter.messageIndex !== undefined) {
        clonedFilter.messageIndex = cloneFilterValue(filter.messageIndex);
    }
    if (filter.playerName !== undefined) {
        clonedFilter.playerName = cloneFilterValue(filter.playerName);
    }
    if (filter.account !== undefined) {
        clonedFilter.account = cloneFilterValue(filter.account);
    }
    if (filter.time !== undefined) {
        clonedFilter.time = new Date(filter.time.getTime());
    }
    if (filter.timeStart !== undefined) {
        clonedFilter.timeStart = cloneFilterValue(filter.timeStart);
    }
    if (filter.timeEnd !== undefined) {
        clonedFilter.timeEnd = cloneFilterValue(filter.timeEnd);
    }
    if (filter.content !== undefined) {
        clonedFilter.content = cloneFilterValue(filter.content);
    }
    if (filter.isOoc !== undefined) {
        clonedFilter.isOoc = filter.isOoc;
    }
    if (filter.isCommand !== undefined) {
        clonedFilter.isCommand = filter.isCommand;
    }
    if (filter.hasImage !== undefined) clonedFilter.hasImage = filter.hasImage;
    if (isRoleType(filter.role) || isRoleTypeArray(filter.role)) {
        clonedFilter.role = cloneFilterValue(filter.role);
    }
    if (filter.note !== undefined) {
        clonedFilter.note = cloneFilterValue(filter.note);
    }
    return clonedFilter;
}

export function cloneDocuments(documents: LogDocument[]): LogDocument[] {
    return documents.map((doc) => ({
        docId: doc.docId,
        source: doc.source ? { ...doc.source } : undefined,
        docName: doc.docName,
        docIndex: doc.docIndex,
        isExpanded: doc.isExpanded,
        chunks: doc.chunks.map((chunk) => ({
            chunkId: chunk.chunkId,
            docId: chunk.docId,
            chunkName: chunk.chunkName,
            chunkIndex: chunk.chunkIndex,
            messages: chunk.messages.map((message) => ({
                messageId: message.messageId,
                originalMessageId: message.originalMessageId,
                meta: message.meta ? cloneLogMetadata(message.meta) : undefined,
                chunkId: message.chunkId,
                messageIndex: message.messageIndex,
                playerName: message.playerName,
                account: message.account,
                time: new Date(message.time.getTime()),
                content: message.content,
                ...(message.images
                    ? { images: message.images.map((image) => ({ ...image })) }
                    : {}),
                isOoc: message.isOoc,
                isCommand: message.isCommand,
                role: message.role,
                note: message.note,
            })),
        })),
    }));
}

// 工程保存和历史快照共用，日期、正则及数组不能与正在编辑的规则共享引用。
export function cloneRules(rules: StyleRule[]): StyleRule[] {
    return rules.map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        filter: cloneMessageFilter(rule.filter),
        style: { ...rule.style },
        area: rule.area,
        priority: rule.priority,
        isActive: rule.isActive,
    }));
}

export function cloneViewSettings(viewSettings: ViewSettings): ViewSettings {
    return {
        hideOoc: viewSettings.hideOoc,
        hideCommand: viewSettings.hideCommand,
        enableMarkdown: viewSettings.enableMarkdown,
        colorMode: viewSettings.colorMode,
    };
}

export function deriveDefaultProjectName(documents: LogDocument[]): string {
    if (documents.length === 0) {
        return '';
    }

    const sortedDocuments = [...documents].sort(
        (a, b) => a.docIndex - b.docIndex,
    );
    return sortedDocuments[0]?.docName?.trim() || '';
}

export function buildWorkspaceProject(params: {
    projectId: string;
    projectName: string;
    time?: string;
    documents: LogDocument[];
    styleRules: StyleRule[];
    viewSettings: ViewSettings;
}): WorkspaceProject {
    const documents = cloneDocuments(params.documents);
    const projectName =
        params.projectName.trim() || deriveDefaultProjectName(documents);

    return {
        projectId: params.projectId,
        projectName,
        time: params.time || new Date().toISOString(),
        documents,
        styleRules: cloneRules(params.styleRules),
        viewSettings: cloneViewSettings(params.viewSettings),
    };
}

export function sanitizeProjectFilename(projectName: string): string {
    const baseName = projectName.trim() || 'project';
    return baseName.replace(/[\\/:*?"<>|]/g, '_');
}
