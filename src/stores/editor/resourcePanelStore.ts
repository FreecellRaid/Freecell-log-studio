import { iterateMessageImages } from '@/editor/resourceReferences';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useImageInsertStore } from './imageInsertStore';
import { useSelectionStore } from './selectionStore';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { resourceRepository } from '@/io/storage/resourceStorage';
import type { ImageAttachment } from '@/types/resource';

export const useResourcePanelStore = defineStore('resourcePanel', () => {
    const log = useLogStore();
    const selection = useSelectionStore();
    const commands = useLogCommands();
    const tasks = useResourceTasksStore();
    const preparing = ref(false);
    const feedback = ref('');
    const resources = computed(() => {
        const groups = new Map<
            string,
            {
                resourceId: string;
                attachment: ImageAttachment;
                names: string[];
                messageIds: Set<string>;
                count: number;
            }
        >();
        for (const { message, attachment: image } of iterateMessageImages(
            log.allMessages,
        )) {
            let group = groups.get(image.resourceId);
            if (!group) {
                group = {
                    resourceId: image.resourceId,
                    attachment: image,
                    names: [],
                    messageIds: new Set(),
                    count: 0,
                };
                groups.set(image.resourceId, group);
            }
            if (!group.names.includes(image.name)) group.names.push(image.name);
            group.messageIds.add(message.messageId);
            group.count++;
        }
        return [...groups.values()];
    });
    const selectedIds = computed(() =>
        selection.getSelectedIds({ kind: 'resources' }, 'resource'),
    );
    const selectedCount = computed(
        () =>
            resources.value.filter((item) =>
                selectedIds.value.has(item.resourceId),
            ).length,
    );
    const clearSelection = () =>
        selection.clearSelection({ kind: 'resources' }, 'resource');
    const selectAll = () =>
        selection.selectAll(
            { kind: 'resources' },
            'resource',
            resources.value,
            (item) => item.resourceId,
        );
    function select(event: MouseEvent, id: string) {
        selection.handleEventSelection(
            { kind: 'resources' },
            'resource',
            event,
            id,
            resources.value,
            (item) => item.resourceId,
        );
    }
    function editResource(id: string) {
        const resource = resources.value.find((item) => item.resourceId === id);
        const messageId = resource?.messageIds.values().next().value;
        // 去重列表以首次引用的附件打开现有编辑器，名称和顺序仍属于对应消息。
        if (resource && messageId)
            useImageInsertStore().open(messageId, resource.attachment.imageId);
    }
    function toggle(id: string) {
        const ids = new Set(selectedIds.value);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        selection.select({ kind: 'resources' }, 'resource', [...ids]);
    }
    function selectAdjacent(direction: 'next' | 'previous') {
        if (!selectedCount.value) {
            const first = resources.value[0];
            if (first)
                selection.select(
                    { kind: 'resources' },
                    'resource',
                    first.resourceId,
                );
            return;
        }
        const method =
            direction === 'next'
                ? selection.selectNext
                : selection.selectPrevious;
        method(
            { kind: 'resources' },
            'resource',
            resources.value,
            (item) => item.resourceId,
        );
    }
    function deleteSelected() {
        const ids = new Set(
            resources.value
                .filter((item) => selectedIds.value.has(item.resourceId))
                .map((item) => item.resourceId),
        );
        if (!ids.size) return;
        if (commands.removeImageResources(ids)) {
            tasks.cancelAll(ids);
            clearSelection();
            feedback.value = `已移除 ${ids.size} 项资源的图片引用，可撤销。`;
        }
    }
    async function downloadSelected() {
        if (preparing.value) return;
        const ids = resources.value
            .filter((item) => selectedIds.value.has(item.resourceId))
            .map((item) => item.resourceId);
        if (!ids.length) return;
        const projectId = log.projectId;
        const documents = log.documents;
        preparing.value = true;
        feedback.value = '';
        try {
            const records = await Promise.allSettled(
                ids.map((id) => resourceRepository.get(id)),
            );
            if (projectId !== log.projectId || documents !== log.documents)
                return;
            const currentIds = new Set(
                resources.value.map((item) => item.resourceId),
            );
            let queued = 0,
                skipped = 0,
                failed = 0;
            records.forEach((result, index) => {
                const id = ids[index]!;
                if (!currentIds.has(id)) return;
                if (result.status === 'rejected') {
                    failed++;
                    return;
                }
                const record = result.value;
                const status = tasks.states[id]?.status;
                if (
                    !record?.sourceUrl ||
                    record.blob ||
                    status === 'queued' ||
                    status === 'loading'
                ) {
                    skipped++;
                    return;
                }
                tasks.enqueue(id, true);
                queued++;
            });
            feedback.value = `已加入下载队列 ${queued} 项，跳过 ${skipped} 项${failed ? `，读取失败 ${failed} 项` : ''}。`;
        } finally {
            preparing.value = false;
        }
    }
    watch(
        () => log.projectId,
        () => {
            clearSelection();
            feedback.value = '';
        },
        { flush: 'sync' },
    );
    watch(
        () => log.documents,
        () => {
            feedback.value = '';
        },
        { flush: 'sync' },
    );
    // 批量修改只在本轮编辑结束后裁剪一次选区，避免逐条重建整个资源列表。
    watch(
        () => resources.value.map((item) => item.resourceId),
        (ids) => {
            const valid = new Set(ids);
            const selected = selectedIds.value;
            if ([...selected].some((id) => !valid.has(id)))
                selection.select(
                    { kind: 'resources' },
                    'resource',
                    [...selected].filter((id) => valid.has(id)),
                );
        },
    );
    return {
        resources,
        selectedIds,
        selectedCount,
        preparing,
        feedback,
        select,
        toggle,
        editResource,
        selectAll,
        clearSelection,
        selectAdjacent,
        deleteSelected,
        downloadSelected,
    };
});
