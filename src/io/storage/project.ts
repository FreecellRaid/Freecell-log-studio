import type { ColorRule, ViewSettings } from '@/types/style';
import type { LogDocument, MessageFilter } from '@/types/log';
import { isRoleType } from '@/types/log';
import type { ProjectFile } from '@/types/project';
import { stripFileExtension } from '@/utils/fileName';
import { generateId } from '@/utils/id';

export const PROJECT_FILE_VERSION = 1 as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    if (filter.content !== undefined) {
        clonedFilter.content = cloneFilterValue(filter.content);
    }
    if (filter.isOoc !== undefined) {
        clonedFilter.isOoc = filter.isOoc;
    }
    if (filter.isCommand !== undefined) {
        clonedFilter.isCommand = filter.isCommand;
    }
    if (isRoleType(filter.role)) {
        clonedFilter.role = filter.role;
    }
    if (filter.note !== undefined) {
        clonedFilter.note = cloneFilterValue(filter.note);
    }
    return clonedFilter;
}

export function cloneDocuments(documents: LogDocument[]): LogDocument[] {
    return documents.map((doc) => ({
        docId: doc.docId,
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
                chunkId: message.chunkId,
                messageIndex: message.messageIndex,
                playerName: message.playerName,
                account: message.account,
                time: new Date(message.time.getTime()),
                content: message.content,
                isOoc: message.isOoc,
                isCommand: message.isCommand,
                role: message.role,
                note: message.note,
            })),
        })),
    }));
}

export function cloneRules(rules: ColorRule[]): ColorRule[] {
    return rules.map((rule) => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        filter: cloneMessageFilter(rule.filter),
        color: rule.color,
        colorArea: rule.colorArea,
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

export function buildProjectFile(params: {
    projectId: string;
    projectName: string;
    time?: string;
    documents: LogDocument[];
    colorRules: ColorRule[];
    viewSettings: ViewSettings;
}): ProjectFile {
    const documents = cloneDocuments(params.documents);
    const projectName =
        params.projectName.trim() || deriveDefaultProjectName(documents);

    return {
        version: PROJECT_FILE_VERSION,
        projectId: params.projectId,
        projectName,
        time: params.time || new Date().toISOString(),
        documents,
        colorRules: cloneRules(params.colorRules),
        viewSettings: cloneViewSettings(params.viewSettings),
    };
}

function normalizeDate(value: unknown, fallback = new Date()): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(value.getTime());
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return new Date(fallback.getTime());
}

function normalizeFilter(rawFilter: unknown): MessageFilter {
    if (!isRecord(rawFilter)) {
        return {};
    }

    const filter: MessageFilter = {};

    if (
        typeof rawFilter.messageId === 'string' ||
        Array.isArray(rawFilter.messageId)
    ) {
        filter.messageId = rawFilter.messageId as MessageFilter['messageId'];
    }
    if (
        typeof rawFilter.chunkId === 'string' ||
        Array.isArray(rawFilter.chunkId)
    ) {
        filter.chunkId = rawFilter.chunkId as MessageFilter['chunkId'];
    }
    if (
        typeof rawFilter.messageIndex === 'number' ||
        Array.isArray(rawFilter.messageIndex)
    ) {
        filter.messageIndex =
            rawFilter.messageIndex as MessageFilter['messageIndex'];
    }
    if (
        typeof rawFilter.playerName === 'string' ||
        Array.isArray(rawFilter.playerName)
    ) {
        filter.playerName = rawFilter.playerName as MessageFilter['playerName'];
    }
    if (
        typeof rawFilter.account === 'string' ||
        Array.isArray(rawFilter.account)
    ) {
        filter.account = rawFilter.account as MessageFilter['account'];
    }
    if (
        typeof rawFilter.content === 'string' ||
        Array.isArray(rawFilter.content)
    ) {
        filter.content = rawFilter.content as MessageFilter['content'];
    }
    if (typeof rawFilter.note === 'string' || Array.isArray(rawFilter.note)) {
        filter.note = rawFilter.note as MessageFilter['note'];
    }
    if (rawFilter.time !== undefined) {
        filter.time = normalizeDate(rawFilter.time);
    }
    if (typeof rawFilter.isOoc === 'boolean') {
        filter.isOoc = rawFilter.isOoc;
    }
    if (typeof rawFilter.isCommand === 'boolean') {
        filter.isCommand = rawFilter.isCommand;
    }
    if (isRoleType(rawFilter.role)) {
        filter.role = rawFilter.role as MessageFilter['role'];
    }

    return filter;
}

function normalizeDocuments(rawDocuments: unknown): LogDocument[] {
    if (!Array.isArray(rawDocuments)) {
        throw new Error('无效的工程文件：documents 缺失');
    }

    return rawDocuments.map((doc, docIndex) => {
        if (!isRecord(doc) || !Array.isArray(doc.chunks)) {
            throw new Error('无效的工程文件：document 结构错误');
        }

        return {
            docId: typeof doc.docId === 'string' ? doc.docId : generateId(),
            docName:
                typeof doc.docName === 'string'
                    ? stripFileExtension(doc.docName)
                    : `Document-${docIndex + 1}`,
            docIndex:
                typeof doc.docIndex === 'number' ? doc.docIndex : docIndex,
            isExpanded:
                typeof doc.isExpanded === 'boolean' ? doc.isExpanded : true,
            chunks: doc.chunks.map((chunk, chunkIndex) => {
                if (!isRecord(chunk) || !Array.isArray(chunk.messages)) {
                    throw new Error('无效的工程文件：chunk 结构错误');
                }

                return {
                    chunkId:
                        typeof chunk.chunkId === 'string'
                            ? chunk.chunkId
                            : generateId(),
                    docId:
                        typeof chunk.docId === 'string'
                            ? chunk.docId
                            : typeof doc.docId === 'string'
                              ? doc.docId
                              : generateId(),
                    chunkName:
                        typeof chunk.chunkName === 'string'
                            ? chunk.chunkName
                            : `场景-${chunkIndex + 1}`,
                    chunkIndex:
                        typeof chunk.chunkIndex === 'number'
                            ? chunk.chunkIndex
                            : chunkIndex,
                    messages: chunk.messages.map((message, messageIndex) => {
                        if (!isRecord(message)) {
                            throw new Error('无效的工程文件：message 结构错误');
                        }

                        return {
                            messageId:
                                typeof message.messageId === 'string'
                                    ? message.messageId
                                    : generateId(),
                            chunkId:
                                typeof message.chunkId === 'string'
                                    ? message.chunkId
                                    : typeof chunk.chunkId === 'string'
                                      ? chunk.chunkId
                                      : generateId(),
                            messageIndex:
                                typeof message.messageIndex === 'number'
                                    ? message.messageIndex
                                    : messageIndex,
                            playerName:
                                typeof message.playerName === 'string'
                                    ? message.playerName
                                    : '',
                            account:
                                typeof message.account === 'string'
                                    ? message.account
                                    : '',
                            time: normalizeDate(message.time),
                            content:
                                typeof message.content === 'string'
                                    ? message.content
                                    : '',
                            isOoc:
                                typeof message.isOoc === 'boolean'
                                    ? message.isOoc
                                    : false,
                            isCommand:
                                typeof message.isCommand === 'boolean'
                                    ? message.isCommand
                                    : false,
                            role: isRoleType(message.role)
                                ? message.role
                                : 'unknown',
                            note:
                                typeof message.note === 'string'
                                    ? message.note
                                    : '',
                        };
                    }),
                };
            }),
        };
    });
}

function normalizeRules(rawRules: unknown): ColorRule[] {
    if (!Array.isArray(rawRules)) {
        return [];
    }

    return rawRules
        .filter((rule) => isRecord(rule))
        .map((rule) => ({
            ruleId:
                typeof rule.ruleId === 'string' ? rule.ruleId : generateId(),
            ruleName:
                typeof rule.ruleName === 'string'
                    ? rule.ruleName
                    : '未命名规则',
            filter: normalizeFilter(rule.filter),
            color: typeof rule.color === 'string' ? rule.color : '#1976D2',
            colorArea:
                rule.colorArea === 'all' ||
                rule.colorArea === 'playerName' ||
                rule.colorArea === 'content'
                    ? rule.colorArea
                    : 'all',
            priority: typeof rule.priority === 'number' ? rule.priority : 0,
            isActive:
                typeof rule.isActive === 'boolean' ? rule.isActive : false,
        }));
}

function normalizeViewSettings(rawViewSettings: unknown): ViewSettings {
    const defaults: ViewSettings = {
        hideOoc: false,
        hideCommand: false,
        enableMarkdown: false,
        colorMode: 'playerName',
    };

    if (!isRecord(rawViewSettings)) {
        return defaults;
    }

    return {
        hideOoc:
            typeof rawViewSettings.hideOoc === 'boolean'
                ? rawViewSettings.hideOoc
                : defaults.hideOoc,
        hideCommand:
            typeof rawViewSettings.hideCommand === 'boolean'
                ? rawViewSettings.hideCommand
                : defaults.hideCommand,
        enableMarkdown:
            typeof rawViewSettings.enableMarkdown === 'boolean'
                ? rawViewSettings.enableMarkdown
                : defaults.enableMarkdown,
        colorMode:
            rawViewSettings.colorMode === 'account' ||
            rawViewSettings.colorMode === 'playerName'
                ? rawViewSettings.colorMode
                : defaults.colorMode,
    };
}

export function normalizeProjectFile(
    rawProject: unknown,
    options: { regenerateProjectId?: boolean } = {},
): ProjectFile {
    if (!isRecord(rawProject)) {
        throw new Error('无效的工程文件：根结构错误');
    }

    const documents = normalizeDocuments(rawProject.documents);
    const projectId =
        options.regenerateProjectId || typeof rawProject.projectId !== 'string'
            ? generateId()
            : rawProject.projectId;
    const projectName =
        typeof rawProject.projectName === 'string'
            ? stripFileExtension(rawProject.projectName)
            : '';
    const time =
        typeof rawProject.time === 'string' &&
        !Number.isNaN(new Date(rawProject.time).getTime())
            ? rawProject.time
            : new Date().toISOString();

    return {
        version: PROJECT_FILE_VERSION,
        projectId,
        projectName: projectName || deriveDefaultProjectName(documents),
        time,
        documents,
        colorRules: normalizeRules(rawProject.colorRules),
        viewSettings: normalizeViewSettings(rawProject.viewSettings),
    };
}

export function tryParseProjectFile(
    jsonText: string,
    options: { regenerateProjectId?: boolean } = {},
): ProjectFile | null {
    try {
        const parsed = JSON.parse(jsonText) as unknown;
        return normalizeProjectFile(parsed, options);
    } catch {
        return null;
    }
}

export function parseProjectFile(
    jsonText: string,
    options: { regenerateProjectId?: boolean } = {},
): ProjectFile {
    const parsed = tryParseProjectFile(jsonText, options);
    if (!parsed) {
        throw new Error('无效的工程 JSON 文件');
    }
    return parsed;
}

export function sanitizeProjectFilename(projectName: string): string {
    const baseName = projectName.trim() || 'project';
    return baseName.replace(/[\\/:*?"<>|]/g, '_');
}
