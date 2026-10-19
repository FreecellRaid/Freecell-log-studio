// 不支持跨页面锁时保守跳过删除；多个编辑器页面并存时也不回收。
const WORKSPACES = 'freecell-resource-workspaces';
const OPERATIONS = 'freecell-resource-operations';
let workspace:
    | { ready: Promise<void>; held: Promise<unknown>; release: () => void }
    | undefined;
let maintenance: Promise<unknown> = Promise.resolve();
const protectedIds = new Set<string>();
let locksUnavailable = false;
function locks() {
    return locksUnavailable || typeof navigator === 'undefined'
        ? undefined
        : navigator.locks;
}

async function holdWorkspace() {
    const manager = locks();
    if (!manager) return;
    if (!workspace) {
        let release!: () => void;
        let acquired!: () => void;
        let failed!: (reason: unknown) => void;
        const ready = new Promise<void>((resolve, reject) => {
            acquired = resolve;
            failed = reject;
        });
        const held = manager.request(
            WORKSPACES,
            { mode: 'shared' },
            async () => {
                acquired();
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
            },
        );
        void held.catch(failed);
        workspace = { ready, held, release: () => release() };
    }
    try {
        await workspace.ready;
    } catch {
        locksUnavailable = true;
        workspace = undefined;
    }
}

export async function ensureResourceWorkspace() {
    await maintenance;
    await holdWorkspace();
}
export function protectResources(ids: Iterable<string>) {
    for (const id of ids) protectedIds.add(id);
}
export function pendingResourceIds() {
    return new Set(protectedIds);
}

export async function withResourceOperation<T>(
    operation: () => Promise<T>,
): Promise<T> {
    await ensureResourceWorkspace();
    const manager = locks();
    return manager
        ? manager.request(OPERATIONS, { mode: 'shared' }, operation)
        : operation();
}

export async function withExclusiveResourceCleanup(
    operation: () => Promise<number>,
) {
    const manager = locks();
    if (!manager) return { removedCount: 0, skipped: true };
    const task = maintenance
        .catch(() => undefined)
        .then(async () => {
            await holdWorkspace();
            if (!workspace) return { removedCount: 0, skipped: true };
            const held = workspace!;
            workspace = undefined;
            held.release();
            await held.held;
            try {
                return await manager.request(
                    WORKSPACES,
                    { mode: 'exclusive', ifAvailable: true },
                    async (lock) => {
                        if (!lock) return { removedCount: 0, skipped: true };
                        return manager.request(
                            OPERATIONS,
                            { mode: 'exclusive', ifAvailable: true },
                            async (operationLock) => {
                                if (!operationLock)
                                    return { removedCount: 0, skipped: true };
                                return {
                                    removedCount: await operation(),
                                    skipped: false,
                                };
                            },
                        );
                    },
                );
            } finally {
                await holdWorkspace();
            }
        });
    maintenance = task.catch(() => undefined);
    return task;
}
