import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { resolveRemoteInput } from '@/io/import/remoteLink';
import { readRemoteLog } from '@/io/import/remoteReader';
import { importFiles } from '@/io/import/importService';
import { useFileImport } from '@/composables/application/useImporter';
import { useLogStore } from '@/stores/project/logStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useImportSettingsStore } from '@/stores/io/importSettingsStore';
import type { ImportTextEntry } from '@/types/import';

export const useRemoteImportStore = defineStore('remoteImport', () => {
    const windowStore = useWindowStore();
    const visible = computed(() => windowStore.isWindowOpen('remoteImport'));
    const input = ref('');
    const loading = ref(false);
    const error = ref('');
    const message = ref('');
    const originalEntry = ref<ImportTextEntry>();
    const canDownloadOriginal = computed(
        () => !loading.value && Boolean(originalEntry.value),
    );
    let controller: AbortController | undefined;

    // 取消网络请求后，已经开始的解析也可能继续完成，需要阻止旧结果覆盖新请求。
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
        originalEntry.value = undefined;
    }

    function close() {
        if (visible.value) windowStore.closeModal('remoteImport');
        else cancel();
    }

    function downloadOriginal() {
        const entry = originalEntry.value;
        if (!canDownloadOriginal.value || !entry) return;
        const blob = new Blob([entry.text], {
            type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = entry.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
        link.download = /\.[a-z0-9]+$/i.test(name)
            ? name
            : `${name || '原始日志'}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
            originalEntry.value = entry;
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
                message.value = '这份日志就在工作区中，已经为你导入好了哦～';
                if (useImportSettingsStore().autoCloseRemoteImport) close();
                return;
            }
            // 先完成解析，切换链接或取消后不再应用旧结果。
            const documents = await importFiles([entry], logs.documents.length);
            if (current !== revision) return;
            const doc = documents[0];
            if (!doc)
                throw new Error('诶，日志里没有可导入的消息呢(•́⍛•̀; ≡ •́⍛•̀;)');

            // 复用统一的应用入口，保留消息字段和导入偏好。
            useFileImport().applyLogDocuments(documents);
            message.value = '日志已导入，点击右上角关闭弹窗❛‿˂̵✧';
            const chunk = doc.chunks[0];
            if (chunk) windowStore.setActiveChunk(chunk.chunkId);
            if (useImportSettingsStore().autoCloseRemoteImport) close();
        } catch (cause) {
            if (current !== revision) return;
            error.value =
                cause instanceof Error
                    ? cause.message
                    : '导入失败了｡°(°¯᷄◠¯᷅°)°｡';
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
        canDownloadOriginal,
        downloadOriginal,
        open,
        close,
        cancel,
        importLink,
    };
});
