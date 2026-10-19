import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectDatabase } from '@/io/storage/database';
import { deleteUnreferencedResources } from '@/io/storage/resourceCleanup';
import { migrateProjectFileTo } from '@/io/storage/projectFile';

describe('conservative resource cleanup', () => {
    let database: ProjectDatabase;
    let sequence = 0;
    beforeEach(() => {
        database = new ProjectDatabase(`cleanup-test-${++sequence}`);
    });
    afterEach(async () => {
        vi.restoreAllMocks();
        await database.delete();
    });
    it('protects all saved projects and caller roots while removing only orphan records', async () => {
        const project = migrateProjectFileTo({
            documents: [{ chunks: [{ messages: [{ content: 'text' }] }] }],
        }).project;
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'image', resourceId: 'saved', name: 'saved' },
        ];
        await database.projects.put(project);
        for (const id of ['saved', 'history', 'clipboard', 'pending', 'orphan'])
            await database.resources.add({
                type: 'image',
                resourceId: id,
                updatedAt: 1,
            });
        expect(
            await deleteUnreferencedResources(
                database,
                new Set(['history', 'clipboard', 'pending']),
            ),
        ).toBe(1);
        expect(
            (await database.resources.toCollection().primaryKeys()).sort(),
        ).toEqual(['clipboard', 'history', 'pending', 'saved']);
    });
    it('rolls back a failed resource cleanup without deleting project records', async () => {
        await database.resources.add({
            type: 'image',
            resourceId: 'orphan',
            updatedAt: 1,
        });
        vi.spyOn(database.resources, 'bulkDelete').mockRejectedValueOnce(
            new Error('failed'),
        );
        await expect(
            deleteUnreferencedResources(database, new Set()),
        ).rejects.toThrow('failed');
        expect(await database.resources.count()).toBe(1);
    });
});

// 只模拟锁调度；IndexedDB 事务本身由上面的 fake-indexeddb 执行。
function lockManager() {
    const holders = new Map<string, { mode: string }[]>();
    const waiting: (() => void)[] = [];
    return {
        request(
            name: string,
            options: { mode?: string; ifAvailable?: boolean },
            callback: (lock: object | null) => unknown,
        ) {
            return new Promise((resolve, reject) => {
                const run = () => {
                    const active = holders.get(name) ?? [];
                    const mode = options.mode ?? 'exclusive';
                    if (
                        active.length &&
                        (mode === 'exclusive' ||
                            active.some((lock) => lock.mode === 'exclusive'))
                    ) {
                        if (options.ifAvailable)
                            Promise.resolve(callback(null)).then(
                                resolve,
                                reject,
                            );
                        else waiting.push(run);
                        return;
                    }
                    const lock = { mode };
                    holders.set(name, [...active, lock]);
                    void Promise.resolve()
                        .then(() => callback(lock))
                        .finally(() => {
                            holders.set(
                                name,
                                (holders.get(name) ?? []).filter(
                                    (item) => item !== lock,
                                ),
                            );
                            const pending = waiting.splice(0);
                            pending.forEach((resume) => resume());
                        })
                        .then(resolve, reject);
                };
                run();
            });
        },
    };
}

describe('cross-page resource coordination', () => {
    beforeEach(() => {
        vi.resetModules();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });
    it('skips destructive cleanup without Web Locks', async () => {
        vi.stubGlobal('navigator', {});
        const coordinator = await import('@/io/storage/resourceCoordination');
        const remove = vi.fn(async () => 1);
        expect(await coordinator.withExclusiveResourceCleanup(remove)).toEqual({
            removedCount: 0,
            skipped: true,
        });
        expect(remove).not.toHaveBeenCalled();
    });
    it('skips cleanup while another page holds an active workspace', async () => {
        vi.stubGlobal('navigator', { locks: lockManager() });
        const first = await import('@/io/storage/resourceCoordination');
        await first.ensureResourceWorkspace();
        vi.resetModules();
        const second = await import('@/io/storage/resourceCoordination');
        await second.ensureResourceWorkspace();
        const remove = vi.fn(async () => 1);
        expect(await first.withExclusiveResourceCleanup(remove)).toEqual({
            removedCount: 0,
            skipped: true,
        });
        expect(remove).not.toHaveBeenCalled();
    });
    it('runs cleanup exclusively and allows resource operations again afterward', async () => {
        vi.stubGlobal('navigator', { locks: lockManager() });
        const coordinator = await import('@/io/storage/resourceCoordination');
        expect(
            await coordinator.withExclusiveResourceCleanup(async () => 3),
        ).toEqual({ removedCount: 3, skipped: false });
        expect(
            await coordinator.withResourceOperation(async () => 'saved'),
        ).toBe('saved');
    });
    it('skips cleanup while a download or write is still running', async () => {
        vi.stubGlobal('navigator', { locks: lockManager() });
        const coordinator = await import('@/io/storage/resourceCoordination');
        let release!: () => void;
        let started!: () => void;
        const ready = new Promise<void>((resolve) => {
            started = resolve;
        });
        const running = coordinator.withResourceOperation(
            () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                    started();
                }),
        );
        await ready;
        const remove = vi.fn(async () => 1);
        expect(
            (await coordinator.withExclusiveResourceCleanup(remove)).skipped,
        ).toBe(true);
        expect(remove).not.toHaveBeenCalled();
        release();
        await running;
    });
    it('keeps resource writes usable if lock access is denied', async () => {
        vi.stubGlobal('navigator', {
            locks: {
                request: () =>
                    Promise.reject(new DOMException('denied', 'SecurityError')),
            },
        });
        const coordinator = await import('@/io/storage/resourceCoordination');
        expect(
            await coordinator.withResourceOperation(async () => 'saved'),
        ).toBe('saved');
        expect(
            (await coordinator.withExclusiveResourceCleanup(async () => 1))
                .skipped,
        ).toBe(true);
    });
});
