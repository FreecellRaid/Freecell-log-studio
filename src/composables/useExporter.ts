import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useExportStore } from '@/stores/exportStore';
import { flattenLogToRows } from '@/io/export/flattener';
import { sanitizeProjectFilename } from '@/io/localStorage/project';
import {
    textAdapter,
    htmlAdapter,
    docAdapter,
} from '@/io/export/adapters/exportAdapters';
import type { ExportFormat, ExportRow } from '@/types/export';

export function useExport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const exportStore = useExportStore();

    function buildRows(): ExportRow[] {
        const { documents } = logStore;
        const { viewSettings, activeRules } = styleStore;

        return flattenLogToRows(documents, viewSettings, activeRules);
    }

    async function exportWithAdapter(
        adapter: (
            rows: ExportRow[],
            format: ExportFormat,
        ) => string | Blob | Promise<string | Blob>,
        format: ExportFormat,
        fileExtension: string,
        mimeType: string,
    ) {
        const rows = buildRows();
        const content = await adapter(rows, format);

        const rawFileName = logStore.projectName || 'export_log';
        const finalFileName = `${sanitizeProjectFilename(rawFileName)}${fileExtension}`;

        downloadFile(content, finalFileName, mimeType);
    }

    // ===== 对外接口 =====

    function buildClipboardContent(
        format: ExportFormat = exportStore.activeFormat,
    ): { text: string; html: string } {
        const rows = buildRows();
        return {
            text: textAdapter(rows, format),
            html: htmlAdapter(rows, format),
        };
    }

    const exportAsText = async (
        format: ExportFormat = exportStore.activeFormat,
    ) => {
        await exportWithAdapter(
            textAdapter,
            format,
            format.fileExtension || '.txt',
            'text/plain;charset=utf-8',
        );
    };

    const copyExportToClipboard = async (
        format: ExportFormat = exportStore.activeFormat,
    ) => {
        const content = buildClipboardContent(format);
        await writeExportToClipboard(content);
    };

    const exportAsHtml = async (
        format: ExportFormat = exportStore.activeFormat,
    ) => {
        await exportWithAdapter(
            htmlAdapter,
            format,
            '.html',
            'text/html;charset=utf-8',
        );
    };

    const exportAsDoc = async (
        format: ExportFormat = exportStore.activeFormat,
    ) => {
        await exportWithAdapter(
            docAdapter,
            format,
            '.doc',
            'application/msword',
        );
    };

    const exportAsDocx = async (
        format: ExportFormat = exportStore.activeFormat,
    ) => {
        const { docxAdapter } =
            await import('@/io/export/adapters/docxAdapter');
        await exportWithAdapter(
            docxAdapter,
            format,
            '.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
    };

    return {
        exportAsText,
        exportAsHtml,
        exportAsDoc,
        exportAsDocx,
        copyExportToClipboard,
    };
}

async function writeExportToClipboard(content: { text: string; html: string }) {
    if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': new Blob([content.text], {
                    type: 'text/plain',
                }),
                'text/html': new Blob([content.html], {
                    type: 'text/html',
                }),
            }),
        ]);
        return;
    }

    await writeTextToClipboard(content.text);
}

async function writeTextToClipboard(content: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error('复制失败');
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

function downloadFile(
    content: string | Blob,
    filename: string,
    mimeType: string = 'text/plain;charset=utf-8',
) {
    // 兼容判断：如果已经是 Blob 就直接用，否则包装成 Blob
    const blob =
        content instanceof Blob
            ? content
            : new Blob([content], { type: mimeType });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 0);
}
