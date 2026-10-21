import { protectResources } from '@/io/storage/resourceCoordination';
import { retryAfterResourceCleanup } from '@/io/storage/resourceCleanup';
import { currentResourceRoots } from '@/composables/application/resourceRoots';
import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { resourceRepository } from '@/io/storage/resourceStorage';

export const useResourceTasksStore = defineStore('resourceTasks', () => {
    const states = reactive<
        Record<
            string,
            {
                status: 'queued' | 'loading' | 'ready' | 'error' | 'cancelled';
                error?: string;
            }
        >
    >({});
    const queue: string[] = [];
    const controllers = new Map<string, AbortController>();
    let active = 0;
    function summarize(ids: Iterable<string> = Object.keys(states)) {
        const summary = {
            total: 0,
            queued: 0,
            loading: 0,
            ready: 0,
            error: 0,
            cancelled: 0,
            pending: 0,
        };
        for (const id of new Set(ids)) {
            const task = states[id];
            if (!task) continue;
            summary.total++;
            summary[task.status]++;
        }
        summary.pending = summary.queued + summary.loading;
        return summary;
    }
    const pendingCount = computed(() => summarize().pending);
    function pump() {
        while (active < 3 && queue.length) {
            const id = queue.shift()!;
            active++;
            states[id] = { status: 'loading' };
            const runningState = states[id];
            const controller = new AbortController();
            controllers.set(id, controller);
            void (async () => {
                try {
                    const record = await resourceRepository.get(id);
                    controller.signal.throwIfAborted();
                    if (!record) throw new Error('图片资源缺失。');
                    if (!record.blob)
                        await retryAfterResourceCleanup(
                            () =>
                                resourceRepository.download(
                                    id,
                                    controller.signal,
                                ),
                            currentResourceRoots,
                        );
                    controller.signal.throwIfAborted();
                    if (states[id] === runningState)
                        states[id] = { status: 'ready' };
                } catch (error) {
                    if (states[id] === runningState)
                        states[id] = {
                            status: controller.signal.aborted
                                ? 'cancelled'
                                : 'error',
                            error:
                                error instanceof TypeError
                                    ? '无法保存副本，可能是跨域限制或网络错误。'
                                    : error instanceof Error
                                      ? error.message
                                      : '图片下载失败，可能是链接失效或跨域限制。',
                        };
                } finally {
                    active--;
                    if (controllers.get(id) === controller)
                        controllers.delete(id);
                    pump();
                }
            })();
        }
    }
    function enqueue(id: string, retry = false) {
        if (
            states[id] &&
            (!retry ||
                states[id]!.status === 'loading' ||
                states[id]!.status === 'queued')
        )
            return;
        protectResources([id]);
        states[id] = { status: 'queued' };
        queue.push(id);
        pump();
    }
    function cancel(id: string) {
        const controller = controllers.get(id);
        if (controller) controller.abort();
        else if (states[id]?.status === 'queued') {
            const index = queue.indexOf(id);
            if (index !== -1) queue.splice(index, 1);
            states[id] = { status: 'cancelled' };
        }
    }
    function cancelAll(ids: Iterable<string> = Object.keys(states)) {
        const selected = [...new Set(ids)];
        // 先移除等待任务，避免活动任务结束后又从队列启动已停止的任务。
        for (const id of selected)
            if (states[id]?.status === 'queued') cancel(id);
        for (const id of selected)
            if (states[id]?.status === 'loading') cancel(id);
    }
    function retryFailed(ids: Iterable<string> = Object.keys(states)) {
        for (const id of new Set(ids))
            if (states[id]?.status === 'error') enqueue(id, true);
    }
    function resumeCancelled(ids: Iterable<string> = Object.keys(states)) {
        for (const id of new Set(ids))
            if (states[id]?.status === 'cancelled') enqueue(id, true);
    }
    async function saveLocalCopy(id: string, file: Blob) {
        cancel(id);
        await retryAfterResourceCleanup(
            () => resourceRepository.saveLocalCopy(id, file),
            currentResourceRoots,
        );
        // 补全成功后，旧下载任务的延迟结束不能覆盖新的就绪状态。
        states[id] = { status: 'ready' };
    }
    return {
        states,
        pendingCount,
        summarize,
        enqueue,
        cancel,
        cancelAll,
        retryFailed,
        resumeCancelled,
        saveLocalCopy,
    };
});
