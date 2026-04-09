import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import type { LogDocument } from '@/types/log';
import { buildLogDocument } from '@/io/import/parser';
import { dispatchAdapter } from '@/io/import/importAdapters';
import { tryParseProjectFile } from '@/io/localStorage/project';
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
        }
    }
    return documents;
}

export function useFileImport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const projectManager = useProjectManager();

    async function importAndApply(files: File[]): Promise<number> {
        const fileEntries = await Promise.all(
            files.map(async (file) => {
                const rawText = await file.text();
                return {
                    file,
                    text: preprocessText(rawText),
                };
            }),
        );

        const projectFiles = fileEntries
            .map((entry) => ({
                file: entry.file,
                project: tryParseProjectFile(entry.text, {
                    regenerateProjectId: true,
                }),
            }))
            .filter(
                (
                    entry,
                ): entry is {
                    file: File;
                    project: NonNullable<
                        ReturnType<typeof tryParseProjectFile>
                    >;
                } => entry.project !== null,
            );

        if (projectFiles.length > 0) {
            if (fileEntries.length !== 1) {
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
            return applied ? 1 : 0;
        }

        const documents = await importFiles(
            fileEntries.map((e) => ({ name: e.file.name, text: e.text })),
            logStore.documents.length,
        );

        if (documents.length === 0) {
            return 0;
        }

        logStore.appendDocuments(documents);
        styleStore.syncSystemRulesFromMessages(logStore.allMessages);
        return documents.length;
    }

    return {
        importAndApply,
    };
}