import type { LogDocument, Message } from '@/types/log';
import type { ViewSettings, ColorRule } from '@/types/style';
import type { ExportRow, ExportStyle } from '@/types/export';
import { computeStyleForMessage } from '@/editor/styleEngine';
import { normalizeExportContentNewlines } from './templateParser';
import { formatDate } from '@/utils/date';
import type { CSSProperties } from 'vue';

//将 Web 端的 CSSProperties 转换为导出通用的抽象 ExportStyle
function mapCssToExportStyle(css: CSSProperties): ExportStyle {
    const style: ExportStyle = {};

    if (css.color) style.color = css.color as string;

    // 预留的一些其他样式接口
    if (css.fontWeight) {
        style.bold =
            css.fontWeight === 'bold' ||
            (typeof css.fontWeight === 'number' && css.fontWeight > 500);
    }

    if (css.fontStyle === 'italic') {
        style.italic = true;
    }

    return style;
}

/**
 * 核心转换函数：将嵌套的文档结构展平为线性的导出行
 * @param documents 原始文档数组
 * @param viewSettings 当前的视图过滤设置
 * @param activeRules 当前启用的染色规则
 */
export function flattenLogToRows(
    documents: LogDocument[],
    viewSettings: ViewSettings,
    activeRules: ColorRule[],
): ExportRow[] {
    const rows: ExportRow[] = [];

    documents.forEach((doc) => {
        rows.push({
            type: 'documentSeparator',
            content: doc.docName || '未命名文档',
        });

        doc.chunks.forEach((chunk) => {
            rows.push({
                type: 'chunkSeparator',
                content: chunk.chunkName || '未命名分块',
            });

            chunk.messages.forEach((msg: Message) => {
                let Time = formatDate(msg.time);
                let Account = msg.account;
                if (msg.isOoc && viewSettings.hideOoc) return;
                if (msg.isCommand && viewSettings.hideCommand) return;
                const computed = computeStyleForMessage(msg, activeRules);

                rows.push({
                    type: 'message',
                    playerName: msg.playerName,
                    account: Account,
                    time: Time,
                    content: normalizeExportContentNewlines(msg.content),
                    nameStyle: mapCssToExportStyle(computed.nameStyle),
                    contentStyle: mapCssToExportStyle(computed.contentStyle),
                });
            });
        });
    });

    return rows;
}
