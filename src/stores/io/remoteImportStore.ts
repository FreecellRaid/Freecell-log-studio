import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { resolveRemoteInput } from '@/io/import/remoteLink';
import { readRemoteLog } from '@/io/import/remoteReader';
import { importFiles } from '@/io/import/importService';
import { useFileImport } from '@/composables/application/useImporter';
import { useLogStore } from '@/stores/project/logStore';
import { useWindowStore } from '@/stores/ui/windowStore';

export const useRemoteImportStore = defineStore('remoteImport', () => {
    const windowStore = useWindowStore();
    const visible = computed(() => windowStore.isWindowOpen('remoteImport'));
    const input = ref('');
    const loading = ref(false);
    const error = ref('');
    const message = ref('');
    let controller: AbortController | undefined;
    let revision = 0;

    function cancel() {
        revision++;
        controller?.abort();
        controller = undefined;
        loading.value = false;
    }

    // 通用关闭入口也同步取消请求，不依赖组件卸载或平台切换。
    watch(
        visible,
        (isVisible) => {
            if (!isVisible) cancel();
        },
        { flush: 'sync' },
    );

    function open() {
        windowStore.openModal('remoteImport');
        error.value = '';
        message.value = '';
    }

    function close() {
        if (visible.value) windowStore.closeModal('remoteImport');
        else cancel();
    }

    async function importLink(value = input.value) {
        cancel();
        const current = revision;
        const activeController = new AbortController();
        controller = activeController;
        input.value = value;
        open();
        loading.value = true;
        error.value = '';
        message.value = '';
        try {
            const request = resolveRemoteInput(value);
            const entry = await readRemoteLog(request, {
                signal: activeController.signal,
            });
            if (current !== revision) return;
            const logs = useLogStore();
            const existing =
                entry.source &&
                logs.documents.find(
                    (doc) =>
                        doc.source?.provider === entry.source?.provider &&
                        doc.source?.id === entry.source?.id,
                );
            if (existing) {
                const chunk = existing.chunks[0];
                if (chunk) windowStore.setActiveChunk(chunk.chunkId);
                message.value = '这份日志已在当前工作区中，已为你打开。';
                return;
            }
            // 先完成解析，切换链接或取消后不再应用旧结果。
            const documents = await importFiles([entry], logs.documents.length);
            if (current !== revision) return;
            const doc = documents[0];
            if (!doc) throw new Error('日志中没有可导入的消息');
            // 复用统一的应用入口，保留消息字段和导入偏好。
            useFileImport().applyLogDocuments(documents);
            close();
            const chunk = doc.chunks[0];
            if (chunk) windowStore.setActiveChunk(chunk.chunkId);
        } catch (cause) {
            if (current !== revision) return;
            error.value =
                cause instanceof Error ? cause.message : '日志导入失败';
        } finally {
            if (current === revision) {
                loading.value = false;
                controller = undefined;
            }
        }
    }

    return {
        input,
        loading,
        error,
        message,
        open,
        close,
        cancel,
        importLink,
    };
});
