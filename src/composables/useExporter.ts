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
import type { ExportFormat } from '@/types/export';

export function useExport() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const exportStore = useExportStore();

    function buildRows() {
        const { documents } = logStore;
        const { viewSettings, enabledRules } = styleStore;

        return flattenLogToRows(documents, viewSettings, enabledRules);
    }

    async function exportWithAdapter(
        adapter: (rows: any, format: ExportFormat) => any,
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

    const exportAsText = (format: ExportFormat = exportStore.currentFormat) => {
        exportWithAdapter(
            textAdapter,
            format,
            format.fileExtension || '.txt',
            'text/plain;charset=utf-8',
        );
    };

    const exportAsHtml = (format: ExportFormat = exportStore.currentFormat) => {
        exportWithAdapter(
            htmlAdapter,
            format,
            '.html',
            'text/html;charset=utf-8',
        );
    };

    const exportAsDoc = (format: ExportFormat = exportStore.currentFormat) => {
        exportWithAdapter(docAdapter, format, '.doc', 'application/msword');
    };

    const exportAsDocx = async (
        format: ExportFormat = exportStore.currentFormat,
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
    };
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
