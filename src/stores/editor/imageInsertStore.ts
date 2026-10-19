import { retryAfterResourceCleanup } from '@/io/storage/resourceCleanup';
import { currentResourceRoots } from '@/composables/application/resourceRoots';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import {
    resourceRepository,
    normalizeImageUrl,
} from '@/io/storage/resourceStorage';
import { generateId } from '@/utils/id';
import type { ImageAttachment } from '@/types/resource';
import type { LogDocument } from '@/types/log';

export const useImageInsertStore = defineStore('imageInsert', () => {
    const target = shallowRef<{
        projectId: string;
        messageId: string;
        documents: LogDocument[];
    } | null>(null);
    const loading = ref(false);
    const error = ref('');
    let attempt = 0;
    const log = useLogStore();
    const commands = useLogCommands();
    const windows = useWindowStore();
    const tasks = useResourceTasksStore();
    function open(messageId: string) {
        attempt++;
        target.value = {
            projectId: log.projectId,
            messageId,
            documents: log.documents,
        };
        loading.value = false;
        error.value = '';
        windows.openModal('imageInsert');
    }
    function cancel() {
        attempt++;
        loading.value = false;
        target.value = null;
    }
    function close() {
        cancel();
        windows.closeModal('imageInsert');
    }
    async function insert(input: {
        files?: File[];
        url?: string;
        name?: string;
    }) {
        if (loading.value || !target.value) return;
        const ticket = ++attempt;
        const destination = target.value;
        loading.value = true;
        error.value = '';
        try {
            const attachments: ImageAttachment[] = [];
            if (input.files?.length) {
                for (const file of input.files) {
                    const resourceId = await retryAfterResourceCleanup(
                        () => resourceRepository.addLocal(file, file.name),
                        currentResourceRoots,
                    );
                    if (ticket !== attempt) return;
                    attachments.push({
                        imageId: generateId(),
                        resourceId,
                        name:
                            input.files.length === 1 && input.name?.trim()
                                ? input.name.trim()
                                : file.name,
                    });
                }
            } else {
                const url = normalizeImageUrl(input.url ?? '');
                const resourceId = await retryAfterResourceCleanup(
                    () => resourceRepository.addRemote(url),
                    currentResourceRoots,
                );
                if (ticket !== attempt) return;
                attachments.push({
                    imageId: generateId(),
                    resourceId,
                    name: input.name?.trim() || '图片',
                });
            }
            const message = log.messagesById.get(destination.messageId);
            if (
                ticket !== attempt ||
                log.projectId !== destination.projectId ||
                log.documents !== destination.documents ||
                !message
            )
                throw new Error('目标消息已删除或工作区已切换，未插入图片。');
            commands.updateMessage(message.chunkId, message.messageId, {
                images: [...(message.images ?? []), ...attachments],
            });
            if (!input.files?.length)
                attachments.forEach((image) => tasks.enqueue(image.resourceId));
            close();
        } catch (reason) {
            if (ticket === attempt)
                error.value =
                    reason instanceof Error
                        ? reason.message
                        : '图片保存失败，请重试。';
        } finally {
            if (ticket === attempt) loading.value = false;
        }
    }
    return { target, loading, error, open, close, cancel, insert };
});
