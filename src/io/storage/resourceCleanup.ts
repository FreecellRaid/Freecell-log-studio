import { collectDocumentResourceIds } from '@/editor/resourceReferences';
import { projectDatabase, type ProjectDatabase } from '@/io/storage/database';
import {
    pendingResourceIds,
    withExclusiveResourceCleanup,
} from './resourceCoordination';

// 调用方必须持有跨页面独占锁；仅供受锁保护的入口和事务测试使用。
export async function deleteUnreferencedResources(
    database: ProjectDatabase,
    protectedIds: Set<string>,
) {
    return database.transaction(
        'rw',
        database.projects,
        database.resources,
        async () => {
            const roots = new Set(protectedIds);
            const projects = await database.projects.toArray();
            for (const project of projects)
                for (const id of collectDocumentResourceIds(project.documents))
                    roots.add(id);
            const unused = (
                await database.resources.toCollection().primaryKeys()
            ).filter((id) => !roots.has(id));
            await database.resources.bulkDelete(unused);
            return unused.length;
        },
    );
}

export async function cleanupResources(getRoots: () => Iterable<string>) {
    return withExclusiveResourceCleanup(async () => {
        const roots = pendingResourceIds();
        for (const id of getRoots()) roots.add(id);
        return deleteUnreferencedResources(projectDatabase, roots);
    });
}

export async function retryAfterResourceCleanup<T>(
    operation: () => Promise<T>,
    getRoots: () => Iterable<string>,
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const quota =
            error instanceof Error &&
            (error.name === 'QuotaExceededError' ||
                ('reason' in error && error.reason === 'quota'));
        if (!quota) throw error;
        let removed = 0;
        try {
            removed = (await cleanupResources(getRoots)).removedCount;
        } catch {
            /* 保留原始配额错误，不能清理时不删除工程。 */
        }
        if (!removed) throw error;
        return operation();
    }
}
