import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { ImportRow, ImportTextEntry } from '@/types/import';
import type { Chunk, LogDocument, LogSource } from '@/types/log';

import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useProjectManager } from '@/composables/application/useProjectManager';
import { useImportSettingsStore } from '@/stores/io/importSettingsStore';

import { resourceRepository } from '@/io/storage/resourceStorage';
import { tryReadWorkspaceProject } from '@/io/storage/workspaceProject';
import { retryAfterResourceCleanup } from '@/io/storage/resourceCleanup';

import type { ImportResourceOptions } from '@/io/import/importResources';
import { readImportFile } from '@/io/import/fileReader';
import { importFiles, preprocessText } from '@/io/import/importService';
import { stripOocParentheses } from '@/io/import/cleaner';
import { importRows } from '@/io/import/importService';
export { importFiles } from '@/io/import/importService';

import { stripFileExtension } from '@/utils/fileName';
import { currentResourceRoots } from './resourceRoots';

export function useFileImport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const navigation = useEditorNavigation();
    const projectManager = useProjectManager();
    const historyStore = useHistoryStore();
    const importSettingsStore = useImportSettingsStore();

    function resourceOptions(signal?: AbortSignal): ImportResourceOptions {
        return {
            signal,
            persistResources: (resources) =>
                retryAfterResourceCleanup(
                    () => resourceRepository.addImported(resources),
                    currentResourceRoots,
                ),
        };
    }

    async function prepareLogDocuments(
        entries: ImportTextEntry[],
        signal?: AbortSignal,
    ) {
        return importFiles(
            entries,
            logStore.documents.length,
            resourceOptions(signal),
        );
    }

    function getFirstChunk(): Chunk | null {
        let firstChunk: Chunk | null = null;
        let firstDocIndex = Number.POSITIVE_INFINITY;
        let firstChunkIndex = Number.POSITIVE_INFINITY;

        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                if (
                    doc.docIndex < firstDocIndex ||
                    (doc.docIndex === firstDocIndex &&
                        chunk.chunkIndex < firstChunkIndex)
                ) {
                    firstChunk = chunk;
                    firstDocIndex = doc.docIndex;
                    firstChunkIndex = chunk.chunkIndex;
                }
            }
        }

        return firstChunk;
    }

    // 自动打开第一个场景进入编辑，先清掉指向已消失 chunk 的view
    function openFirstChunkViewIfNeeded() {
        const hasValidView = navigation.pruneScenes((chunkId) =>
            Boolean(logStore.findChunkById(chunkId)),
        );
        if (hasValidView) return;
        const firstChunk = getFirstChunk();
        if (firstChunk) {
            navigation.showScene(firstChunk.chunkId);
        }
    }

    function applyDocuments(
        documents: LogDocument[],
        focusImported = false,
    ): number {
        if (documents.length === 0) return 0;
        const messages = documents.flatMap((doc) =>
            doc.chunks.flatMap((chunk) => chunk.messages),
        );
        if (messages.length > 0 && importSettingsStore.stripOocParentheses) {
            for (const message of messages) {
                if (message.isOoc)
                    message.content = stripOocParentheses(message.content);
            }
        }
        logStore.appendDocuments(documents);
        styleStore.syncSystemRulesFromMessages(logStore.allMessages);
        historyStore.clearHistory();
        const first = documents[0]?.chunks[0];
        if (focusImported && first) navigation.showScene(first.chunkId);
        else openFirstChunkViewIfNeeded();
        return documents.length;
    }

    async function importRowsAndApply(
        rows: ImportRow[],
        name: string,
        source?: LogSource,
    ): Promise<number> {
        const destination = logStore.documents;
        const projectId = logStore.projectId;
        const doc = await importRows(
            rows,
            name,
            logStore.documents.length,
            resourceOptions(),
        );
        if (
            logStore.documents !== destination ||
            logStore.projectId !== projectId
        )
            throw new Error('工作区已切换，未应用导入结果。');
        if (!doc.chunks.length) throw new Error('日志中没有可导入的消息');
        doc.source = source ? { ...source } : undefined;
        return applyDocuments([doc], true);
    }

    // 远程日志只能追加日志，不能替换为工程文件
    async function importTextAndApply(
        entries: ImportTextEntry[],
    ): Promise<number> {
        const destination = logStore.documents;
        const projectId = logStore.projectId;
        const textEntries = entries.map((entry) => ({
            ...entry,
            name: entry.name,
            text: preprocessText(entry.text),
        }));
        const projectFiles = textEntries
            .map((entry) => ({
                name: entry.name,
                project: tryReadWorkspaceProject(entry.text),
            }))
            .filter(
                (
                    entry,
                ): entry is {
                    name: string;
                    project: NonNullable<
                        ReturnType<typeof tryReadWorkspaceProject>
                    >;
                } => entry.project !== null,
            );

        if (projectFiles.length > 0) {
            if (textEntries.length !== 1) {
                throw new Error(
                    '工程 JSON 仅支持单文件导入，请不要与普通日志混合导入。',
                );
            }

            const applied = await projectManager.replaceWorkspaceWithProject(
                projectFiles[0].project,
                {
                    confirmIfNeeded: true,
                },
            );
            return applied ? 1 : 0;
        }

        const documents = await prepareLogDocuments(textEntries);
        if (
            logStore.documents !== destination ||
            logStore.projectId !== projectId
        )
            throw new Error('工作区已切换，未应用导入结果。');

        return applyDocuments(documents);
    }

    async function importAndApply(files: File[]): Promise<number> {
        const destination = logStore.documents;
        const projectId = logStore.projectId;
        const entries = await Promise.all(
            files.map(async (file) => {
                const imported = await readImportFile(file);
                if (imported.source === 'text') {
                    console.log(
                        `文件 ${file.name} 检测编码: ${imported.encoding}（置信度 ${imported.confidence?.toFixed(2)}）`,
                    );
                } else {
                    console.log(`文件 ${file.name} 已提取 DOCX 纯文本`);
                }
                return {
                    name: stripFileExtension(file.name),
                    text: imported.text,
                };
            }),
        );
        if (
            logStore.documents !== destination ||
            logStore.projectId !== projectId
        )
            throw new Error('工作区已切换，未应用导入结果。');
        return importTextAndApply(entries);
    }

    return {
        importAndApply,
        importTextAndApply,
        prepareLogDocuments,
        applyLogDocuments: (documents: LogDocument[]) =>
            applyDocuments(documents, true),
        importRowsAndApply,
    };
}

export function useFileImportInput() {
    const fileInput = ref<HTMLInputElement | null>(null);
    const { importAndApply, importTextAndApply } = useFileImport();

    function setFileInput(element: Element | ComponentPublicInstance | null) {
        fileInput.value = element instanceof HTMLInputElement ? element : null;
    }

    function triggerImport() {
        fileInput.value?.click();
    }

    async function handleFileChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files?.length) return;

        try {
            await importAndApply(Array.from(files));
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error ? error.message : '解析文件时发生错误',
            );
        } finally {
            target.value = '';
        }
    }

    async function importFromClipboard() {
        try {
            if (!navigator.clipboard?.readText) {
                throw new Error('当前浏览器不支持读取剪切板。');
            }
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                throw new Error('剪切板中没有可导入的文本。');
            }
            await importTextAndApply([{ name: '剪切板导入', text }]);
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : '从剪切板导入时发生错误',
            );
        }
    }

    return {
        setFileInput,
        triggerImport,
        handleFileChange,
        importFromClipboard,
    };
}
