import { normalizeImageUrl } from '@/utils/imageUrl';
import { retryAfterResourceCleanup } from '@/io/storage/resourceCleanup';
import { currentResourceRoots } from '@/composables/application/resourceRoots';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useWindowStore } from '@/stores/ui/windowStore';
import {
    resourceRepository,
} from '@/io/storage/resourceStorage';
import { generateId } from '@/utils/id';
import type { ImageAttachment } from '@/types/resource';
import type { LogDocument } from '@/types/log';

export const useImageInsertStore = defineStore('imageInsert', () => {
    const target = shallowRef<{
        projectId: string;
        messageId: string;
        documents: LogDocument[];
        imageId?: string;
        resourceId?: string;
    } | null>(null);
    const loading = ref(false);
    const error = ref('');
    let attempt = 0;
    const log = useLogStore();
    const commands = useLogCommands();
    const windows = useWindowStore();
    function open(messageId: string, imageId?: string) {
        const image = log.messagesById
            .get(messageId)
            ?.images?.find((item) => item.imageId === imageId);
        if (imageId && !image) return;
        attempt++;
        target.value = {
            projectId: log.projectId,
            messageId,
            documents: log.documents,
            imageId,
            resourceId: image?.resourceId,
        };
        loading.value = false;
        error.value = '';
        windows.openModal('imageInsert');
    }
    async function saveEdit(input: {
        name: string;
        position: number;
        file?: File;
        url?: string;
    }) {
        if (loading.value || !target.value?.imageId) return;
        const destination = target.value;
        const ticket = ++attempt;
        loading.value = true;
        error.value = '';
        try {
            if (!Number.isInteger(input.position) || input.position < 1)
                throw new Error('请输入有效的图片顺序。');
            let resourceId = destination.resourceId!;
            if (input.file) {
                resourceId = await retryAfterResourceCleanup(
                    () =>
                        resourceRepository.addLocal(
                            input.file!,
                            input.file!.name,
                        ),
                    currentResourceRoots,
                );
            } else if (input.url !== undefined) {
                const url = normalizeImageUrl(input.url);
                resourceId = await retryAfterResourceCleanup(
                    () => resourceRepository.addRemote(url),
                    currentResourceRoots,
                );
            }
            if (ticket !== attempt) return;
            const message = log.messagesById.get(destination.messageId);
            const images = [...(message?.images ?? [])];
            const index = images.findIndex(
                (image) => image.imageId === destination.imageId,
            );
            if (
                log.projectId !== destination.projectId ||
                log.documents !== destination.documents ||
                !message ||
                index < 0 ||
                images[index]!.resourceId !== destination.resourceId
            )
                throw new Error(
                    '目标图片已变更、删除或工作区已切换，请重新打开编辑。',
                );
            if (input.position > images.length)
                throw new Error('图片顺序超出了当前图片数量。');
            const original = images[index]!;
            const updated = {
                ...original,
                resourceId,
                name: input.name.trim() || '图片',
            };
            if (
                original.resourceId !== updated.resourceId ||
                original.name !== updated.name ||
                index !== input.position - 1
            ) {
                images.splice(index, 1);
                images.splice(input.position - 1, 0, updated);
                commands.updateMessage(message.chunkId, message.messageId, {
                    images,
                });
            }
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
    return { target, loading, error, open, close, cancel, insert, saveEdit };
});
