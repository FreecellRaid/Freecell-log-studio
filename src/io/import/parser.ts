import type {
    Message,
    Chunk,
    LogDocument,
    RoleType,
    MessageFilter,
} from '@/types/log';
import type { ImportRow } from '@/types/import';
import { generateId } from '@/utils/id';
import { matchesMessageFilter } from '@/editor/filter';

//----核心数据解析----
export function transformRowToMessage(
    row: ImportRow,
    index: number,
    importTime: Date,
): Message {
    let name = row.playerName?.trim() || '';
    let account = row.account?.trim() || '';
    let note = row.note?.trim() || '';

    // 身份兜底互补
    if (!name && !account) {
        name = '未知角色';
        account = 'Unknown';
    } else if (!name) {
        name = account;
    } else if (!account) {
        account = `${name}_ID`;
    }

    const content = row.content;
    const firstLine = content.split('\n')[0] || '';

    // OOC 与 指令判定
    // TODO: 后面补充自定义输入，元信息判断
    const isOoc = /^[\(（]/.test(firstLine);
    const isCommand = /^(\/|\\|\.|。|undefined)/.test(firstLine);

    return {
        messageId: generateId(),
        chunkId: 'null',
        messageIndex: index,
        playerName: name,
        account,
        time: row.time || importTime,
        content,
        isOoc,
        isCommand,
        role: inferRole(name),
        note,
    };
}

export function chunkMessages(
    messages: Message[],
    docId: string,
    splitKeyword?: MessageFilter,
): Chunk[] {
    if (!messages || messages.length === 0) return [];

    const total = messages.length;
    const maxChunkSize = Math.max(1, Math.max(Math.ceil(total * 0.2), 200));
    const chunks: Chunk[] = [];

    const hasKeywordFilter =
        !!splitKeyword &&
        Object.values(splitKeyword).some(
            (value) => value !== undefined && value !== null,
        );

    let start = 0;
    let chunkIndex = 0;

    for (let i = 1; i <= total; i++) {
        const reachedEnd = i === total;
        const startsKeywordChunk =
            !reachedEnd &&
            hasKeywordFilter &&
            i > start &&
            matchesMessageFilter(messages[i], splitKeyword);

        const crossedDay =
            !reachedEnd && !isSameDay(messages[i - 1].time, messages[i].time);
        const reachedSizeLimit = i - start >= maxChunkSize;

        if (
            !reachedEnd &&
            !startsKeywordChunk &&
            !crossedDay &&
            !reachedSizeLimit
        )
            continue;

        const chunkMessagesList = messages.slice(start, i);
        const currentChunkId = generateId();

        for (let j = 0; j < chunkMessagesList.length; j++) {
            chunkMessagesList[j].messageIndex = j;
            chunkMessagesList[j].chunkId = currentChunkId;
        }

        chunks.push({
            chunkId: currentChunkId,
            docId: docId,
            chunkName: makeChunkName(
                hasKeywordFilter &&
                    matchesMessageFilter(chunkMessagesList[0], splitKeyword)
                    ? chunkMessagesList[0]
                    : undefined,
                chunkIndex,
            ),
            chunkIndex: chunkIndex,
            messages: chunkMessagesList,
        });

        start = i;
        chunkIndex++;
    }

    return chunks;
}

export function buildLogDocument(
    rows: ImportRow[],
    fileName: string,
    docIndex: number,
    splitKeyword?: MessageFilter,
): LogDocument {
    const docId = generateId();
    const importTime = new Date();
    const messages = rows.map((r, i) =>
        transformRowToMessage(r, i, importTime),
    );
    const chunks = chunkMessages(messages, docId, splitKeyword);

    return {
        docId,
        docName: fileName,
        docIndex,
        chunks,
        isExpanded: true,
    };
}

//----辅助函数----

//TODO: 占位，自动角色判断规则后面再补
function inferRole(name: string): RoleType {
    const lower = name.toLowerCase();
    if (lower.includes('gm')) return 'gm';
    if (lower.includes('bot')) return 'bot';
    if (lower.includes('ob')) return 'ob';
    if (lower.includes('npc')) return 'npc';
    return 'pl';
}

function isSameDay(msg1: Date, msg2: Date): boolean {
    const y1 = msg1.getFullYear();
    const y2 = msg2.getFullYear();
    const m1 = msg1.getMonth();
    const m2 = msg2.getMonth();
    const d1 = msg1.getDate();
    const d2 = msg2.getDate();
    return y1 === y2 && m1 === m2 && d1 === d2;
}

function makeChunkName(message?: Message, chunkIndex?: number) {
    if (!message) return `场景-${(chunkIndex ?? 0) + 1}`;
    const name = `${message.content.slice(0, 10).trim()}…`;
    return name || `场景-${(chunkIndex ?? 0) + 1}`;
}
