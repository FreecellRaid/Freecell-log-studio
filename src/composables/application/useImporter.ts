import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import type { Chunk, LogDocument } from '@/types/log';
import { buildLogDocument } from '@/io/import/parser';
import { importFiles, preprocessText } from '@/io/import/importService';
import type { ImportRow, ImportTextEntry } from '@/types/import';
import type { LogSource } from '@/types/log';
export { importFiles } from '@/io/import/importService';
import { tryParseProjectFile } from '@/io/storage/project';
import { stripFileExtension } from '@/utils/fileName';
import { readImportFile } from '@/io/import/fileReader';
import { useProjectManager } from '@/composables/application/useProjectManager';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useImportSettingsStore } from '@/stores/ui/importSettingsStore';
import { stripOocParentheses } from '@/io/import/cleaner';

export function useFileImport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const windowStore = useWindowStore();
    const projectManager = useProjectManager();
    const historyStore = useHistoryStore();
    const importSettingsStore = useImportSettingsStore();

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

    function hasOpenedChunkView(): boolean {
        return Array.from(windowStore.openWindows.values()).some(
            (win) => win.windowName === 'chunkView',
        );
    }

    // 自动打开第一个场景进入编辑
    function openFirstChunkViewIfNeeded() {
        if (hasOpenedChunkView()) return;
        const firstChunk = getFirstChunk();
        if (firstChunk) {
            windowStore.setActiveChunk(firstChunk.chunkId);
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
        if (
            messages.length > 0 &&
            importSettingsStore.resolveStripOocParentheses()
        ) {
            for (const message of messages) {
                if (message.isOoc)
                    message.content = stripOocParentheses(message.content);
            }
        }
        logStore.appendDocuments(documents);
        styleStore.syncSystemRulesFromMessages(logStore.allMessages);
        historyStore.clearHistory();
        const first = documents[0]?.chunks[0];
        if (focusImported && first) windowStore.setActiveChunk(first.chunkId);
        else openFirstChunkViewIfNeeded();
        return documents.length;
    }

    async function importRowsAndApply(
        rows: ImportRow[],
        name: string,
        source?: LogSource,
    ): Promise<number> {
        const doc = buildLogDocument(rows, name, logStore.documents.length);
        if (!doc.chunks.length) throw new Error('日志中没有可导入的消息');
        doc.source = source ? { ...source } : undefined;
        return applyDocuments([doc], true);
    }

    // 远程日志只能追加日志，不能通过内容嗅探替换为工程文件。
    async function importLogTextAndApply(
        entries: ImportTextEntry[],
    ): Promise<number> {
        return applyDocuments(
            await importFiles(entries, logStore.documents.length),
            true,
        );
    }

    async function importTextAndApply(
        entries: { name: string; text: string }[],
    ): Promise<number> {
        const textEntries = entries.map((entry) => ({
            name: entry.name,
            text: preprocessText(entry.text),
        }));
        const projectFiles = textEntries
            .map((entry) => ({
                name: entry.name,
                project: tryParseProjectFile(entry.text, {
                    regenerateProjectId: true,
                }),
            }))
            .filter(
                (
                    entry,
                ): entry is {
                    name: string;
                    project: NonNullable<
                        ReturnType<typeof tryParseProjectFile>
                    >;
                } => entry.project !== null,
            );

        if (projectFiles.length > 0) {
            if (textEntries.length !== 1) {
                throw new Error(
                    '工程 JSON 仅支持单文件导入，请不要与普通日志混合导入。',
                );
            }

            const applied = projectManager.replaceWorkspaceWithProject(
                projectFiles[0].project,
                {
                    confirmIfNeeded: true,
                },
            );
            if (applied) {
                openFirstChunkViewIfNeeded();
            }
            return applied ? 1 : 0;
        }

        const documents = await importFiles(
            textEntries.map((entry) => ({
                name: entry.name,
                text: entry.text,
            })),
            logStore.documents.length,
        );

        return applyDocuments(documents);
    }

    async function importAndApply(files: File[]): Promise<number> {
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
        return importTextAndApply(entries);
    }

    return {
        importAndApply,
        importTextAndApply,
        applyLogDocuments: (documents: LogDocument[]) =>
            applyDocuments(documents, true),
        importRowsAndApply,
        importLogTextAndApply,
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
