import { withResourceOperation } from './resourceCoordination';
import type { ProjectFile } from '@/types/projectFile';
import { migrateProjectFileTo, validateProjectFile } from './projectFile';
import {
    ProjectDatabase,
    projectDatabase,
    type LegacyMigrationReport,
} from './database';
import { createResourceRepository } from './resourceStorage';

export const PROJECTS_STORAGE_KEY = 'freecell-log-studio.projects';
const MIGRATION_KEY = 'localStorage-projects-v1' as const;

export interface StoredProjectSummary {
    projectId: string;
    projectName: string;
    time: string;
    documentCount: number;
}

export class ProjectStorageError extends Error {
    readonly reason: 'quota' | 'unavailable' | 'data';
    constructor(
        message: string,
        reason: ProjectStorageError['reason'],
        cause?: unknown,
    ) {
        super(message, { cause });
        this.name = 'ProjectStorageError';
        this.reason = reason;
    }
}

function storageError(error: unknown): ProjectStorageError {
    if (error instanceof ProjectStorageError) return error;
    const name = error instanceof Error ? error.name : '';
    if (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
        return new ProjectStorageError(
            '本地存储空间不足，保存失败；已有工程未被删除。请导出备份或手动删除不需要的工程后重试。',
            'quota',
            error,
        );
    }
    return new ProjectStorageError(
        '无法访问本地工程存储，请检查浏览器存储权限；若其他页面正在使用旧版，请关闭后重试。',
        'unavailable',
        error,
    );
}

function assertProject(value: unknown): asserts value is ProjectFile {
    const result = validateProjectFile(value);
    if (!result.valid)
        throw new ProjectStorageError(
            `工程数据校验失败：${result.errors[0]?.message ?? '未知错误'}`,
            'data',
        );
}

export function createProjectRepository(
    options: {
        database?: ProjectDatabase;
        legacyStorage?: () => Pick<Storage, 'getItem'>;
    } = {},
) {
    const database = options.database ?? projectDatabase;
    const resources = createResourceRepository({ database });
    const legacyStorage =
        options.legacyStorage ?? (() => globalThis.localStorage);
    let initialization: Promise<LegacyMigrationReport> | undefined;

    async function migrateLegacy(): Promise<LegacyMigrationReport> {
        await database.open();
        const done = await database.migrations.get(MIGRATION_KEY);
        if (done) return done;
        let raw: string | null;
        try {
            raw = legacyStorage().getItem(PROJECTS_STORAGE_KEY);
        } catch {
            return {
                key: MIGRATION_KEY,
                completedAt: '',
                importedCount: 0,
                skippedCount: 0,
                warnings: [
                    '无法读取旧版存档；未改动旧数据，下次访问本地存储时将重试。',
                ],
            };
        }
        const projects: ProjectFile[] = [];
        const warnings: string[] = [];
        let skippedCount = 0;
        if (raw !== null) {
            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return {
                    key: MIGRATION_KEY,
                    completedAt: '',
                    importedCount: 0,
                    skippedCount: 0,
                    warnings: [
                        '旧版存档不是有效 JSON，原始备份已保留，未标记迁移完成。',
                    ],
                };
            }
            if (
                !parsed ||
                typeof parsed !== 'object' ||
                !('projects' in parsed) ||
                !Array.isArray(parsed.projects)
            ) {
                return {
                    key: MIGRATION_KEY,
                    completedAt: '',
                    importedCount: 0,
                    skippedCount: 0,
                    warnings: [
                        '旧版存档缺少 projects 数组，原始备份已保留，未标记迁移完成。',
                    ],
                };
            }
            for (const [index, entry] of parsed.projects.entries()) {
                try {
                    projects.push(migrateProjectFileTo(entry).project);
                } catch (error) {
                    skippedCount++;
                    warnings.push(
                        `旧版第 ${index + 1} 个工程未迁移：${error instanceof Error ? error.message : '数据无效'}。原始备份已保留。`,
                    );
                }
            }
        }
        const staged: Awaited<ReturnType<typeof resources.stageProject>>[] = [];
        for (const project of projects.sort(
            (a, b) => Date.parse(b.time) - Date.parse(a.time),
        ))
            staged.push(await resources.stageProject(project, true));
        // 工程、资源、回读验证与迁移标记在同一事务中提交。
        return database.transaction(
            'rw',
            database.projects,
            database.migrations,
            database.resources,
            async () => {
                const completed = await database.migrations.get(MIGRATION_KEY);
                if (completed) return completed;
                let importedCount = 0;
                for (const { project, records } of staged) {
                    if (await database.projects.get(project.projectId))
                        continue;
                    for (const record of records)
                        await database.resources.add(record);
                    await database.projects.add(project);
                    const saved = await database.projects.get(
                        project.projectId,
                    );
                    assertProject(saved);
                    if (JSON.stringify(saved) !== JSON.stringify(project))
                        throw new ProjectStorageError(
                            '旧工程迁移后的数据验证失败，已撤销本次迁移。',
                            'data',
                        );
                    importedCount++;
                }
                const report: LegacyMigrationReport = {
                    key: MIGRATION_KEY,
                    completedAt: new Date().toISOString(),
                    importedCount,
                    skippedCount,
                    warnings,
                };
                await database.migrations.put(report);
                return report;
            },
        );
    }

    async function initialize(): Promise<LegacyMigrationReport> {
        initialization ??= withResourceOperation(migrateLegacy)
            .then((report) => {
                if (!report.completedAt) initialization = undefined;
                return report;
            })
            .catch((error: unknown) => {
                initialization = undefined;
                throw storageError(error);
            });
        return initialization;
    }

    async function run<T>(operation: () => Promise<T>): Promise<T> {
        try {
            await initialize();
            if (!database.isOpen()) await database.open();
            return await operation();
        } catch (error) {
            throw storageError(error);
        }
    }

    return {
        initialize,
        list: () =>
            run(async (): Promise<StoredProjectSummary[]> => {
                const projects = await database.projects.toArray();
                return projects
                    .map((project) => {
                        assertProject(project);
                        return {
                            projectId: project.projectId,
                            projectName: project.projectName,
                            time: project.time,
                            documentCount: project.documents.length,
                        };
                    })
                    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
            }),
        get: (projectId: string) =>
            run(async () => {
                const project = await database.projects.get(projectId);
                if (project) assertProject(project);
                return project;
            }),
        save: async (project: ProjectFile) => {
            assertProject(project);
            const snapshot = JSON.parse(JSON.stringify(project)) as ProjectFile;
            return run(() =>
                withResourceOperation(async () => {
                    const staged = await resources.stageProject(snapshot);
                    await database.transaction(
                        'rw',
                        database.projects,
                        database.resources,
                        async () => {
                            for (const record of staged.records)
                                await database.resources.add(record);
                            await database.projects.put(staged.project);
                        },
                    );
                }),
            );
        },
        delete: (projectId: string) =>
            run(() =>
                database.transaction('rw', database.projects, async () => {
                    if (!(await database.projects.get(projectId))) return false;
                    await database.projects.delete(projectId);
                    return true;
                }),
            ),
    };
}

export const projectRepository = createProjectRepository();
