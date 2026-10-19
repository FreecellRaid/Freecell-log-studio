import Ajv from 'ajv';
import schema from './schemas/project-v3.schema.json';
import { normalizeProjectFile } from './project';
import type { MessageFilter } from '@/types/log';
import {
    PROJECT_SCHEMA,
    PROJECT_SCHEMA_VERSION,
    type ProjectFile,
    type MessageFilterFile,
    type RegExpFile,
} from '@/types/projectFile';

const validateStructure = new Ajv({ allErrors: true }).compile(schema);

export interface ProjectFileIssue {
    path: string;
    message: string;
}

export interface ProjectFileValidation {
    valid: boolean;
    errors: ProjectFileIssue[];
    warnings: ProjectFileIssue[];
}

export class ProjectFileError extends Error {
    readonly issues: ProjectFileIssue[];

    constructor(issues: ProjectFileIssue[]) {
        super(
            issues
                .map((issue) => `${issue.path || '/'}: ${issue.message}`)
                .join('\n'),
        );
        this.name = 'ProjectFileError';
        this.issues = issues;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRegExpFile(value: unknown): value is RegExpFile {
    return (
        isRecord(value) &&
        value.type === 'regexp' &&
        typeof value.source === 'string' &&
        typeof value.flags === 'string'
    );
}

function validDate(value: string): boolean {
    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/,
    );
    if (!match) return false;
    const [
        ,
        year,
        month,
        day,
        hour,
        minute,
        second,
        zone,
        ,
        offsetHour,
        offsetMinute,
    ] = match;
    const y = Number(year);
    const m = Number(month);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return (
        m >= 1 &&
        m <= 12 &&
        Number(day) >= 1 &&
        Number(day) <= days[m - 1]! &&
        Number(hour) < 24 &&
        Number(minute) < 60 &&
        Number(second) < 60 &&
        (zone === 'Z' ||
            (Number(offsetHour) < 24 && Number(offsetMinute) < 60)) &&
        Number.isFinite(Date.parse(value))
    );
}

// 结构校验之外检查引用关系；缺失资源是可恢复警告，不丢弃附件。
export function validateProjectFile(value: unknown): ProjectFileValidation {
    const errors: ProjectFileIssue[] = [];
    const warnings: ProjectFileIssue[] = [];
    if (!validateStructure(value)) {
        return {
            valid: false,
            errors: (validateStructure.errors ?? []).map((error) => ({
                path: error.instancePath,
                message: error.message ?? '结构无效',
            })),
            warnings,
        };
    }
    const project = value as unknown as ProjectFile;
    const checkDate = (date: string, path: string) => {
        if (!validDate(date))
            errors.push({ path, message: '需为有效且带时区的 ISO 日期' });
    };
    const unique = (ids: Set<string>, id: string, path: string) => {
        if (ids.has(id)) errors.push({ path, message: `ID 重复：${id}` });
        ids.add(id);
    };
    checkDate(project.time, '/time');
    const docs = new Set<string>();
    const chunks = new Set<string>();
    const messages = new Set<string>();
    const images = new Set<string>();
    const rules = new Set<string>();
    const usedResources = new Set<string>();
    project.documents.forEach((doc, d) => {
        const dp = `/documents/${d}`;
        unique(docs, doc.docId, `${dp}/docId`);
        doc.chunks.forEach((chunk, c) => {
            const cp = `${dp}/chunks/${c}`;
            unique(chunks, chunk.chunkId, `${cp}/chunkId`);
            if (chunk.docId !== doc.docId)
                errors.push({
                    path: `${cp}/docId`,
                    message: '与所属文档不一致',
                });
            chunk.messages.forEach((message, m) => {
                const mp = `${cp}/messages/${m}`;
                unique(messages, message.messageId, `${mp}/messageId`);
                if (message.chunkId !== chunk.chunkId)
                    errors.push({
                        path: `${mp}/chunkId`,
                        message: '与所属分块不一致',
                    });
                checkDate(message.time, `${mp}/time`);
                message.images.forEach((image, i) => {
                    const ip = `${mp}/images/${i}`;
                    unique(images, image.imageId, `${ip}/imageId`);
                    usedResources.add(image.resourceId);
                    if (!Object.hasOwn(project.resources, image.resourceId)) {
                        warnings.push({
                            path: `${ip}/resourceId`,
                            message: `资源缺失，保留附件：${image.resourceId}`,
                        });
                    }
                });
            });
        });
    });
    for (const [id, resource] of Object.entries(project.resources)) {
        const path = `/resources/${id.replace(/~/g, '~0').replace(/\//g, '~1')}`;
        if (resource.sourceUrl) {
            try {
                const url = new URL(resource.sourceUrl);
                if (!url.hostname || url.username || url.password)
                    throw new Error();
            } catch {
                errors.push({
                    path: `${path}/sourceUrl`,
                    message: '需为不含凭据的 HTTP(S) URL',
                });
            }
        }
        if (resource.data) {
            const base64 = resource.data.value;
            const padding = base64.endsWith('==')
                ? 2
                : base64.endsWith('=')
                  ? 1
                  : 0;
            const size = (base64.length / 4) * 3 - padding;
            const alphabet =
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            const last = alphabet.indexOf(base64[base64.length - padding - 1]!);
            if (
                (padding === 2 && last % 16 !== 0) ||
                (padding === 1 && last % 4 !== 0)
            ) {
                errors.push({
                    path: `${path}/data/value`,
                    message: 'Base64 填充位无效',
                });
            }
            if (resource.byteLength !== size)
                errors.push({
                    path: `${path}/byteLength`,
                    message: '与 Base64 解码字节数不一致',
                });
        } else if (!resource.sourceUrl) {
            warnings.push({
                path,
                message: '图片数据及链接均缺失，保留来源供后续修复',
            });
        }
        if (!usedResources.has(id))
            warnings.push({ path, message: '未引用资源；导出打包时应省略' });
    }
    project.styleRules.forEach((rule, r) => {
        const path = `/styleRules/${r}`;
        unique(rules, rule.ruleId, `${path}/ruleId`);
        for (const [key, entry] of Object.entries(rule.filter)) {
            if (key === 'time' || key === 'timeStart' || key === 'timeEnd')
                checkDate(entry as string, `${path}/filter/${key}`);
            if (isRegExpFile(entry)) {
                try {
                    new RegExp(entry.source, entry.flags);
                } catch {
                    errors.push({
                        path: `${path}/filter/${key}`,
                        message: '无效或当前环境不支持的正则表达式',
                    });
                }
            }
        }
    });
    return { valid: errors.length === 0, errors, warnings };
}

export interface ProjectFileReadResult {
    project: ProjectFile;
    warnings: ProjectFileIssue[];
}

function checkedClone(value: unknown): ProjectFileReadResult {
    const result = validateProjectFile(value);
    if (!result.valid) throw new ProjectFileError(result.errors);
    return {
        project: JSON.parse(JSON.stringify(value)) as ProjectFile,
        warnings: result.warnings,
    };
}

function encodeRegExp(_key: string, value: unknown): unknown {
    return value instanceof RegExp
        ? { type: 'regexp', source: value.source, flags: value.flags }
        : value;
}

// 文件 DTO 迁移入口；编辑器运行时通过 workspaceProject 显式恢复。
export function migrateProjectFileTo(value: unknown): ProjectFileReadResult {
    if (!isRecord(value))
        throw new ProjectFileError([
            { path: '', message: '工程根节点必须是对象' },
        ]);
    if (value.version === PROJECT_SCHEMA_VERSION) return checkedClone(value);
    if (
        value.schema !== undefined ||
        (value.version !== undefined &&
            value.version !== 1 &&
            value.version !== 2)
    ) {
        throw new ProjectFileError([
            { path: '/version', message: '不支持的工程 schema 或版本' },
        ]);
    }
    const legacy = normalizeProjectFile(value);
    // 旧 normalizer 不认识 RegExp；单独保留原规则中的正则，避免迁移时静默丢失。
    const rawRules = (
        Array.isArray(value.styleRules)
            ? value.styleRules
            : Array.isArray(value.colorRules)
              ? value.colorRules
              : []
    ).filter(isRecord);
    const legacyRules = legacy.styleRules.map((rule, index) => {
        const filter: Record<string, unknown> = { ...rule.filter };
        const rawFilter = rawRules[index]?.filter;
        if (isRecord(rawFilter)) {
            for (const key of [
                'messageId',
                'chunkId',
                'playerName',
                'account',
                'content',
                'note',
            ]) {
                if (
                    rawFilter[key] instanceof RegExp ||
                    isRegExpFile(rawFilter[key])
                )
                    filter[key] = rawFilter[key];
            }
        }
        return { ...rule, filter };
    });
    const migrated = {
        ...legacy,
        schema: PROJECT_SCHEMA,
        version: PROJECT_SCHEMA_VERSION,
        documents: legacy.documents.map((doc) => ({
            ...doc,
            chunks: doc.chunks.map((chunk) => ({
                ...chunk,
                docId: doc.docId,
                messages: chunk.messages.map((message) => ({
                    ...message,
                    chunkId: chunk.chunkId,
                    images: [],
                })),
            })),
        })),
        resources: {},
        styleRules: legacyRules,
    };
    return checkedClone(JSON.parse(JSON.stringify(migrated, encodeRegExp)));
}

export function parseProjectFile(text: string): ProjectFileReadResult {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new ProjectFileError([
            { path: '', message: '工程文件不是有效 JSON' },
        ]);
    }
    return migrateProjectFileTo(value);
}

export function stringifyProjectFile(project: ProjectFile): string {
    const { project: checked } = checkedClone(project);
    return JSON.stringify(checked, null, 2);
}

// 日期与正则只在显式恢复运行时筛选条件时构造，不把 DTO 直接交给编辑器。
export function restoreMessageFilter(
    filter: MessageFilterFile,
): MessageFilter & { hasImage?: boolean } {
    return Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [
            key,
            key === 'time' || key === 'timeStart' || key === 'timeEnd'
                ? new Date(value as string)
                : isRegExpFile(value)
                  ? new RegExp(value.source, value.flags)
                  : Array.isArray(value)
                    ? [...value]
                    : value,
        ]),
    ) as MessageFilter & { hasImage?: boolean };
}
