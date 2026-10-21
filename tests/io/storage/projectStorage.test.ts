import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDatabase } from '@/io/storage/database';
import {
    createProjectRepository,
    PROJECTS_STORAGE_KEY,
} from '@/io/storage/projectStorage';
import { buildWorkspaceProject } from '@/io/storage/project';
import { migrateProjectFileTo } from '@/io/storage/projectFile';
import { projectFileToWorkspace } from '@/io/storage/workspaceProject';
import { buildLogDocument } from '@/io/import/parser';
import { reactive } from 'vue';

function project(id = 'project-1', time = '2026-10-19T08:00:00Z') {
    return buildWorkspaceProject({
        projectId: id,
        projectName: id,
        time,
        documents: [
            buildLogDocument(
                [{ content: 'hello', time: new Date(time) }],
                'log',
                0,
            ),
        ],
        styleRules: [
            {
                ruleId: 'rule',
                ruleName: 'regexp',
                filter: { content: /hello/gi, timeStart: new Date(time) },
                style: { bold: true },
                area: 'content',
                priority: 1,
                isActive: true,
            },
        ],
        viewSettings: {
            hideOoc: false,
            hideCommand: false,
            enableMarkdown: false,
            colorMode: 'playerName',
        },
    });
}

describe('IndexedDB project repository', () => {
    let database: ProjectDatabase;
    let backup: string | null;
    let repository: ReturnType<typeof createProjectRepository>;
    let number = 0;
    const legacyStorage = () => ({
        getItem: (key: string) =>
            key === PROJECTS_STORAGE_KEY ? backup : null,
    });
    beforeEach(() => {
        database = new ProjectDatabase(`project-storage-test-${++number}`);
        backup = null;
        repository = createProjectRepository({ database, legacyStorage });
    });
    afterEach(async () => {
        vi.restoreAllMocks();
        await database.delete();
    });

    it('migrates v1/v2 atomically into v3 while retaining the original backup', async () => {
        const v1 = {
            ...project('old'),
            version: 1,
            styleRules: undefined,
            colorRules: [
                {
                    ruleId: 'color',
                    filter: {},
                    color: '#abcdef',
                    colorArea: 'all',
                },
            ],
        };
        backup = JSON.stringify({ projects: [v1, project('new')] });
        const original = backup;
        const report = await repository.initialize();
        expect(report.importedCount).toBe(2);
        expect(await database.projects.count()).toBe(2);
        expect((await repository.get('old'))?.styleRules[0].style).toEqual({
            color: '#abcdef',
        });
        expect((await repository.get('new'))?.version).toBe(3);
        expect(await database.migrations.count()).toBe(1);
        expect(backup).toBe(original);
    });

    it('does not resurrect deleted projects from the retained legacy backup', async () => {
        backup = JSON.stringify({ projects: [project()] });
        await repository.initialize();
        expect(await repository.delete('project-1')).toBe(true);
        repository = createProjectRepository({ database, legacyStorage });
        await repository.initialize();
        expect(await repository.list()).toEqual([]);
        expect(await repository.delete('missing')).toBe(false);
    });

    it('does not overwrite an existing IndexedDB project with an older legacy copy', async () => {
        const newer = migrateProjectFileTo(
            project('same', '2026-10-20T08:00:00Z'),
        ).project;
        await database.projects.put(newer);
        backup = JSON.stringify({ projects: [project('same')] });
        await repository.initialize();
        expect(await repository.get('same')).toEqual(newer);
    });

    it('deduplicates overlapping migration attempts across database connections', async () => {
        backup = JSON.stringify({ projects: [project('one'), project('two')] });
        const otherDatabase = new ProjectDatabase(database.name);
        try {
            const other = createProjectRepository({
                database: otherDatabase,
                legacyStorage,
            });
            await Promise.all([repository.initialize(), other.initialize()]);
            expect(await database.projects.count()).toBe(2);
            expect(await database.migrations.count()).toBe(1);
        } finally {
            otherDatabase.close();
        }
    });

    it('rolls back a partial migration and retries without marking it complete', async () => {
        backup = JSON.stringify({ projects: [project('one'), project('two')] });
        const originalAdd = database.projects.add.bind(database.projects);
        let writes = 0;
        const add = vi
            .spyOn(database.projects, 'add')
            .mockImplementation((entry) => {
                if (++writes === 2)
                    throw new DOMException('full', 'QuotaExceededError');
                return originalAdd(entry);
            });
        await expect(repository.initialize()).rejects.toMatchObject({
            reason: 'quota',
        });
        expect(await database.projects.count()).toBe(0);
        expect(await database.migrations.count()).toBe(0);
        expect(backup).not.toBeNull();
        add.mockRestore();
        expect((await repository.initialize()).importedCount).toBe(2);
    });

    it('reports invalid legacy entries, imports valid ones and keeps the backup intact', async () => {
        backup = JSON.stringify({
            projects: [null, project(), { version: 99, documents: [] }],
        });
        const report = await repository.initialize();
        expect(report.importedCount).toBe(1);
        expect(report.skippedCount).toBe(2);
        expect(report.warnings).toHaveLength(2);
        expect(JSON.parse(backup!).projects).toHaveLength(3);
        expect((await repository.list()).map((item) => item.projectId)).toEqual(
            ['project-1'],
        );
    });

    it('can retry an unreadable legacy payload and still save new projects', async () => {
        backup = '{';
        expect((await repository.initialize()).warnings).toHaveLength(1);
        expect(await database.migrations.count()).toBe(0);
        await repository.save(migrateProjectFileTo(project('new')).project);
        backup = JSON.stringify({ projects: [project('old')] });
        expect((await repository.initialize()).importedCount).toBe(1);
        expect(await database.projects.count()).toBe(2);
    });

    it.each(['', '{}', 'null'])(
        'does not mark malformed legacy payload %s as migrated',
        async (raw) => {
            backup = raw;
            expect((await repository.initialize()).warnings).toHaveLength(1);
            expect(await database.migrations.count()).toBe(0);
            expect(backup).toBe(raw);
        },
    );

    it('does not require readable localStorage for IndexedDB CRUD', async () => {
        repository = createProjectRepository({
            database,
            legacyStorage: () => {
                throw new DOMException('denied', 'SecurityError');
            },
        });
        await repository.save(migrateProjectFileTo(project()).project);
        expect((await repository.get('project-1'))?.projectName).toBe(
            'project-1',
        );
        expect((await repository.initialize()).warnings).toHaveLength(1);
    });

    it('sorts summaries by instant rather than lexical timezone and restores Date/RegExp', async () => {
        const first = migrateProjectFileTo(
            project('later', '2026-10-19T08:00:00Z'),
        ).project;
        const second = migrateProjectFileTo(
            project('earlier', '2026-10-19T12:00:00+08:00'),
        ).project;
        await repository.save(first);
        await repository.save(second);
        expect((await repository.list()).map((item) => item.projectId)).toEqual(
            ['later', 'earlier'],
        );
        expect((await repository.list())[0]).toHaveProperty('documentCount', 1);
        const runtime = projectFileToWorkspace(
            (await repository.get('later'))!,
        );
        expect(runtime.documents[0].chunks[0].messages[0].time).toBeInstanceOf(
            Date,
        );
        expect(runtime.styleRules[0].filter.content).toEqual(/hello/gi);
        expect(runtime.styleRules[0].filter.timeStart).toBeInstanceOf(Date);
    });

    it('takes an independent snapshot of reactive data before initialization completes', async () => {
        const input = reactive(migrateProjectFileTo(project()).project);
        const saving = repository.save(input);
        input.projectName = 'edited-after-save';
        await saving;
        expect((await repository.get('project-1'))?.projectName).toBe(
            'project-1',
        );
    });

    it('keeps the previous version on quota failure and never removes other projects', async () => {
        const original = migrateProjectFileTo(project()).project;
        await repository.save(original);
        await repository.save(migrateProjectFileTo(project('other')).project);
        vi.spyOn(database.projects, 'put').mockRejectedValueOnce(
            new DOMException('full', 'QuotaExceededError'),
        );
        await expect(
            repository.save({ ...original, projectName: 'unsaved' }),
        ).rejects.toMatchObject({ reason: 'quota' });
        expect((await repository.get('project-1'))?.projectName).toBe(
            'project-1',
        );
        expect(await database.projects.count()).toBe(2);
    });

    it('retries after an unavailable database and reopens a closed connection', async () => {
        vi.spyOn(database, 'open').mockRejectedValueOnce(
            new Error('unavailable'),
        );
        await expect(repository.initialize()).rejects.toMatchObject({
            reason: 'unavailable',
        });
        await repository.save(migrateProjectFileTo(project()).project);
        database.close();
        expect((await repository.get('project-1'))?.projectName).toBe(
            'project-1',
        );
    });

    it('rejects invalid saves before overwriting a valid record', async () => {
        const file = migrateProjectFileTo(project()).project;
        await repository.save(file);
        await expect(
            repository.save({ ...file, time: 'invalid' }),
        ).rejects.toMatchObject({ reason: 'data' });
        expect(await repository.get('project-1')).toEqual(file);
    });
});
