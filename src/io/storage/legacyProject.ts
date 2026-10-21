import { cloneLogMetadata } from '@/utils/logMetadata';
import type { WorkspaceProject } from '@/types/project';
import type { LogDocument, MessageFilter, RoleType } from '@/types/log';
import { isRoleType } from '@/types/log';
import type {
    RuleStyle,
    StyleArea,
    StyleRule,
    ViewSettings,
} from '@/types/style';
import { generateId } from '@/utils/id';
import { stripFileExtension } from '@/utils/fileName';
import { deriveDefaultProjectName } from './project';

// 仅在读取旧 v1/v2 文件时使用，不把旧文件版本带入运行时模型。
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isRoleTypeArray(value: unknown): value is RoleType[] {
    return Array.isArray(value) && value.every(isRoleType);
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
    if (rawFilter.timeStart !== undefined) {
        filter.timeStart = normalizeDate(rawFilter.timeStart);
    }
    if (rawFilter.timeEnd !== undefined) {
        filter.timeEnd = normalizeDate(rawFilter.timeEnd);
    }
    if (typeof rawFilter.isOoc === 'boolean') {
        filter.isOoc = rawFilter.isOoc;
    }
    if (typeof rawFilter.isCommand === 'boolean') {
        filter.isCommand = rawFilter.isCommand;
    }
    if (isRoleType(rawFilter.role) || isRoleTypeArray(rawFilter.role)) {
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
            source:
                isRecord(doc.source) &&
                typeof doc.source.provider === 'string' &&
                typeof doc.source.id === 'string'
                    ? { provider: doc.source.provider, id: doc.source.id }
                    : undefined,
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
                            originalMessageId:
                                typeof message.originalMessageId === 'string'
                                    ? message.originalMessageId
                                    : undefined,
                            meta: isRecord(message.meta)
                                ? cloneLogMetadata(message.meta)
                                : undefined,
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

function normalizeRuleStyle(rule: Record<string, unknown>): RuleStyle {
    const rawStyle = isRecord(rule.style) ? rule.style : {};
    const style: RuleStyle = {};
    const color =
        typeof rawStyle.color === 'string'
            ? rawStyle.color
            : typeof rule.color === 'string'
              ? rule.color
              : undefined;

    if (color !== undefined) style.color = color;
    if (rawStyle.bold === true) style.bold = true;
    if (rawStyle.italic === true) style.italic = true;
    return style;
}

function normalizeRuleArea(rule: Record<string, unknown>): StyleArea {
    const area = rule.area ?? rule.colorArea;
    return area === 'all' || area === 'playerName' || area === 'content'
        ? area
        : 'all';
}

function normalizeRules(rawRules: unknown): StyleRule[] {
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
            style: normalizeRuleStyle(rule),
            area: normalizeRuleArea(rule),
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

export function normalizeLegacyProject(
    rawProject: unknown,
    options: { regenerateProjectId?: boolean } = {},
): WorkspaceProject {
    if (!isRecord(rawProject)) {
        throw new Error('无效的工程文件：根结构错误');
    }

    // 仅兼容旧工程；v3 必须走 projectFile 校验和 workspaceProject 桥接。
    if (
        rawProject.schema !== undefined ||
        (rawProject.version !== undefined &&
            rawProject.version !== 1 &&
            rawProject.version !== 2)
    ) {
        throw new Error('当前工程读取流程不支持该 schema 或版本');
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
        projectId,
        projectName: projectName || deriveDefaultProjectName(documents),
        time,
        documents,
        styleRules: normalizeRules(
            Array.isArray(rawProject.styleRules)
                ? rawProject.styleRules
                : rawProject.colorRules,
        ),
        viewSettings: normalizeViewSettings(rawProject.viewSettings),
    };
}
