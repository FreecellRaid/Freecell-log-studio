import type { ImportRow, ImportAdapter } from '@/types/import';
import { parseLogDate } from '@/utils/date';
import { cleanContent } from './cleaner';

// 在if写崩溃了之后，加了个adapter调度器
// adapter test 标准: 元信息+100, 强特征+10, 弱特征+1, 错误特征-10
export function dispatchAdapter(text: string): ImportAdapter {
    const sampleLines = text.split('\n').slice(0, 100);

    let bestAdapter = ALL_ADAPTERS[0];
    let maxScore = -1;

    for (const adapter of ALL_ADAPTERS) {
        const score = adapter.test(sampleLines);
        if (score > maxScore) {
            maxScore = score;
            bestAdapter = adapter;
        }
    }

    return bestAdapter;
}

// 标准(以及看起来标准)的导入格式，匹配header行，兼容各种缺字段和各种时间
const HEADER_REGEX =
    /^(.*?)\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}|\d{1,2}:\d{1,2}:\d{1,2})\s*$/;

const StandardImportAdapter: ImportAdapter = {
    id: 'standard-adapter',
    name: '标准日志格式',

    test: (sampleLines: string[]) => {
        let score = 0;
        for (const line of sampleLines) {
            if (HEADER_REGEX.test(line)) {
                score += 10;
            }
        }
        return score;
    },

    parse: (text: string) => {
        const lines = text.split('\n');
        const rows: ImportRow[] = [];

        let currentHeader: string | null = null;
        let currentTimeMatch: string | null = null;
        let contentBuffer: string[] = [];

        const flushBuffer = () => {
            if (currentHeader !== null && contentBuffer.length > 0) {
                const { playerName, account } = extractIdentity(currentHeader);
                const rawContent = contentBuffer.join('\n');

                rows.push({
                    playerName,
                    account,
                    time: currentTimeMatch
                        ? parseLogDate(currentTimeMatch)
                        : undefined,
                    content: cleanContent(rawContent),
                });
            }
            contentBuffer = [];
        };

        for (const line of lines) {
            const match = line.match(HEADER_REGEX);
            if (match) {
                flushBuffer();
                currentHeader = match[1];
                currentTimeMatch = match[2];
            } else {
                contentBuffer.push(line);
            }
        }
        flushBuffer();

        return rows;
    },
};

// 通用身份提取器：处理 Header 字符串中的 Name 和 Account，解决各类括号嵌套问题。
function extractIdentity(header: string): {
    playerName: string;
    account: string;
} {
    const trimmedHeader = header.trim();
    const matches = Array.from(trimmedHeader.matchAll(/\((.*?)\)/g));

    if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const lastContent = lastMatch[1];

        // playerName里可以有括号，但最后一个括号内容为纯数字 (如 QQ )
        if (/^\d+$/.test(lastContent)) {
            const name = trimmedHeader.slice(0, lastMatch.index).trim();
            return { playerName: name, account: lastContent };
        }

        // 最后一个括号里有复杂嵌套或非数字 (如回声岛)
        const firstParen = trimmedHeader.indexOf('(');
        const lastParen = trimmedHeader.lastIndexOf(')');
        if (firstParen !== -1 && lastParen > firstParen) {
            const name = trimmedHeader.slice(0, firstParen).trim();
            const account = trimmedHeader
                .slice(firstParen + 1, lastParen)
                .trim();
            return { playerName: name, account };
        }
    }
    // 没有account字段 (如猫爷)
    return { playerName: trimmedHeader, account: '' };
}

// 染色器log
// 兼容格式1: <playerName>: content
// 兼容格式2: HH:mm:ss <playerName>: content
// 兼容半角/全角冒号，以及各种空白字符
const PAINTED_LOG_REGEX = /^(?:(\d{2}:\d{2}:\d{2})\s+)?<([^>]+)>[:：]\s*(.*)$/;

export const PaintedLogAdapter: ImportAdapter = {
    id: 'painted-log-adapter',
    name: '染色器日志格式',

    test: (sampleLines: string[]) => {
        let score = 0;
        for (const line of sampleLines) {
            if (/^(?:(?:\d{2}:\d{2}:\d{2})\s+)?<[^>]+>[:：]/.test(line)) {
                score += 10;
            }
        }
        return score;
    },

    parse: (text: string) => {
        const lines = text.split('\n');
        const rows: ImportRow[] = [];

        let currentPlayer: string | null = null;
        let currentTimeStr: string | undefined = undefined;
        let contentBuffer: string[] = [];

        const flushBuffer = () => {
            if (currentPlayer !== null && contentBuffer.length > 0) {
                const rawContent = contentBuffer.join('\n');
                rows.push({
                    playerName: currentPlayer,
                    account: '',
                    time: currentTimeStr
                        ? parseLogDate(currentTimeStr)
                        : undefined,
                    content: cleanContent(rawContent),
                });
            }
            contentBuffer = [];
        };

        for (const line of lines) {
            const match = line.match(PAINTED_LOG_REGEX);
            if (match) {
                flushBuffer();

                currentTimeStr = match[1]; // 可能为 undefined (格式1)
                currentPlayer = match[2].trim();
                const contentText = match[3];

                if (contentText) {
                    contentBuffer.push(contentText);
                }
            } else {
                // 如果没有匹配上 Header，说明是上一句话的换行内容
                if (currentPlayer !== null && line.trim().length > 0) {
                    contentBuffer.push(line);
                }
            }
        }
        flushBuffer();

        return rows;
    },
};

// Ccfolia 格式
// <p style="color: metaRow ;">
// <span> [note] </span>
// <span> palyerName </span> :
// <span> content </span>
// </p>
const CCFOLIA_ENTRY_REGEX =
    /<p\s+style="color:\s*([^"]+?)\s*;?">[\s\S]*?<span>\s*(.*?)\s*<\/span>\s*<span>\s*(.*?)\s*<\/span>\s*:[\s\S]*?<span>([\s\S]*?)<\/span>\s*<\/p>/g;

export const CcfoliaImportAdapter: ImportAdapter = {
    id: 'ccfolia-adapter',
    name: 'Ccfolia HTML 格式',

    test: (sampleLines: string[]) => {
        let score = 0;
        const text = sampleLines.join('\n');

        // 强特征嗅探，title中有元信息
        if (text.includes('<title>ccfolia - logs</title>')) {
            score += 100;
        }

        // 弱特征嗅探：计算带有 style="color:..." 的 <p> 标签数量
        const matchCount = (text.match(/<p\s+style="color:/g) || []).length;
        score += matchCount;

        return score;
    },

    parse: (text: string) => {
        const rows: ImportRow[] = [];
        const matches = text.matchAll(CCFOLIA_ENTRY_REGEX);

        for (const match of matches) {
            const metaRaw = match[1].trim();
            const note = match[2].trim();
            const playerName = match[3].trim();
            let rawContent = match[4];

            // 将 <br> 或 <br/> 替换为实际换行符
            // 去除前后的空白字符
            rawContent = rawContent.replace(/<br\s*\/?>/gi, '\n').trim();

            rows.push({
                playerName,
                content: cleanContent(rawContent),
                note,
                meta: metaRaw ? { tab: metaRaw } : undefined,
            });
        }

        return rows;
    },
};

// 菠萝格式
// [YYYY-MM-DD HH:mm:ss] <playerName|account>  content
const PINEAPPLE_LOG_REGEX = /^\[([^\]]+)\]\s+<([^>|]+)\|([^>]+)>\s*(.*)$/;

export const PineappleImportAdapter: ImportAdapter = {
    id: 'pineapple-adapter',
    name: '菠萝日志格式',

    test: (sampleLines: string[]) => {
        let score = 0;
        for (const line of sampleLines) {
            if (/^\[[^\]]+\]\s+<[^>|]+\|[^>]+>/.test(line)) {
                score += 10;
            }
        }
        return score;
    },

    parse: (text: string) => {
        const lines = text.split('\n');
        const rows: ImportRow[] = [];

        let currentName: string | null = null;
        let currentAccount: string | null = null;
        let currentTimeStr: string | null = null;
        let contentBuffer: string[] = [];

        const flushBuffer = () => {
            if (currentName !== null && contentBuffer.length > 0) {
                const rawContent = contentBuffer.join('\n');
                rows.push({
                    playerName: currentName,
                    account: currentAccount || '',
                    time: currentTimeStr
                        ? parseLogDate(currentTimeStr)
                        : undefined,
                    content: cleanContent(rawContent),
                });
            }
            contentBuffer = [];
        };

        for (const line of lines) {
            const match = line.match(PINEAPPLE_LOG_REGEX);

            if (match) {
                flushBuffer();

                currentTimeStr = match[1].trim();
                currentName = match[2].trim();
                currentAccount = match[3].trim();
                const contentText = match[4];

                if (contentText) {
                    contentBuffer.push(contentText);
                }
            } else {
                if (currentName !== null && line.trim().length > 0) {
                    contentBuffer.push(line);
                }
            }
        }
        flushBuffer();

        return rows;
    },
};

const ALL_ADAPTERS: ImportAdapter[] = [
    StandardImportAdapter,
    PaintedLogAdapter,
    CcfoliaImportAdapter,
    PineappleImportAdapter,
];
