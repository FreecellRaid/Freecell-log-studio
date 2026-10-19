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
    const pendingCount = computed(
        () =>
            Object.values(states).filter(
                (task) => task.status === 'queued' || task.status === 'loading',
            ).length,
    );
    function pump() {
        while (active < 3 && queue.length) {
            const id = queue.shift()!;
            active++;
            states[id] = { status: 'loading' };
            const controller = new AbortController();
            controllers.set(id, controller);
            void (async () => {
                try {
                    const record = await resourceRepository.get(id);
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
                    states[id] = { status: 'ready' };
                } catch (error) {
                    states[id] = {
                        status: controller.signal.aborted
                            ? 'cancelled'
                            : 'error',
                        error:
                            error instanceof Error
                                ? error.message
                                : '图片下载失败，可能是链接失效或跨域限制。',
                    };
                } finally {
                    active--;
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
    return { states, pendingCount, enqueue, cancel };
});
