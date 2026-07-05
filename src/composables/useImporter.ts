import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Chunk, LogDocument } from '@/types/log';
import { buildLogDocument } from '@/io/import/parser';
import { dispatchAdapter } from '@/io/import/importAdapters';
import { tryParseProjectFile } from '@/io/localStorage/project';
import { stripFileExtension } from '@/utils/fileName';
import { readFileAsText } from '@/io/import/textDecoder';
import { useProjectManager } from './useProjectManager';

// 统一换行符并移除0宽字符，防止正则崩掉
function preprocessText(text: string): string {
    return text.replace(/\r\n|\r/g, '\n').replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export async function importFiles(
    fileData: { name: string; text: string }[],
    startIndex: number = 0,
): Promise<LogDocument[]> {
    const documents: LogDocument[] = [];

    for (let i = 0; i < fileData.length; i++) {
        const { name, text } = fileData[i];
        if (!text.trim()) continue;

        try {
            const adapter = dispatchAdapter(text);
            const rows = adapter.parse(text); //
            const doc = buildLogDocument(rows, name, startIndex + i); //
            documents.push(doc);

            console.log(`文件 ${name} 使用适配器: ${adapter.name}`);
        } catch (error) {
            console.error(`解析文件 ${name} 失败:`, error);
            throw new Error(
                `文件 "${name}" 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
            );
        }
    }
    return documents;
}

export function useFileImport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const windowStore = useWindowStore();
    const projectManager = useProjectManager();

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

        if (documents.length === 0) {
            return 0;
        }

        logStore.appendDocuments(documents);
        styleStore.syncSystemRulesFromMessages(logStore.allMessages);
        openFirstChunkViewIfNeeded();
        return documents.length;
    }

    async function importAndApply(files: File[]): Promise<number> {
        const entries = await Promise.all(
            files.map(async (file) => {
                const decoded = await readFileAsText(file);
                console.log(
                    `文件 ${file.name} 检测编码: ${decoded.encoding}（置信度 ${decoded.confidence.toFixed(2)}）`,
                );
                return {
                    name: stripFileExtension(file.name),
                    text: decoded.text,
                };
            }),
        );
        return importTextAndApply(entries);
    }

    return {
        importAndApply,
        importTextAndApply,
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
