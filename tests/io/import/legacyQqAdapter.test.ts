import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    LegacyQqImportAdapter,
    dispatchAdapter,
} from '@/io/import/importAdapters';
import { importFiles } from '@/composables/application/useImporter';

const legacyLog = readFileSync(
    new URL('../../fixtures/import/legacy-qq-adapter.txt', import.meta.url),
    'utf8',
);

describe('legacy QQ message manager adapter', () => {
    it('detects exports and extracts numeric and email accounts, times and paragraphs', () => {
        const adapter = dispatchAdapter(legacyLog);
        expect(adapter.id).toBe('legacy-qq-adapter');
        expect(adapter.parse(legacyLog)).toEqual([
            {
                playerName: '名字',
                account: '12345',
                time: new Date(2022, 4, 10, 11, 28, 25),
                content: '第一行消息\n\n第二段消息',
            },
            {
                playerName: '名字(场外)',
                account: 'player@example.com',
                time: new Date(2022, 4, 10, 11, 29, 26),
                content: '（场外说明）',
            },
            {
                playerName: '骰娘',
                account: '67890',
                time: new Date(2022, 4, 11, 1, 2, 3),
                content: '.r 1d20',
            },
        ]);
    });

    it('detects header-only excerpts without export metadata', () => {
        const text = [
            '2022-05-10 11:28:25 Alice(12345)',
            'first',
            '2022-05-10 11:29:26 Bob<67890>',
            'second',
        ].join('\n');
        expect(dispatchAdapter(text).id).toBe('legacy-qq-adapter');
    });

    it('uses export metadata to recognize a single-message export', () => {
        const text = [
            '消息记录（此消息记录为文本格式，不支持重新导入）',
            '2022-05-10 11:28:25 Alice(12345)',
            'only message',
        ].join('\n');
        expect(dispatchAdapter(text).id).toBe('legacy-qq-adapter');
        expect(LegacyQqImportAdapter.parse(text)).toHaveLength(1);
        expect(() => dispatchAdapter(text.split('\n')[0])).toThrow(
            '无法识别该文件的格式',
        );
    });

    it('preserves parentheses in nicknames and trims identity whitespace', () => {
        expect(
            LegacyQqImportAdapter.parse(
                '2022-05-10 1:2:3 名字(带(嵌套)括号) (0012345)  \n正文',
            ),
        ).toEqual([
            {
                playerName: '名字(带(嵌套)括号)',
                account: '0012345',
                time: new Date(2022, 4, 10, 1, 2, 3),
                content: '正文',
            },
        ]);
    });

    it('preserves non-header timestamps and identity-like text within message bodies', () => {
        const content = [
            '2022-05-10 11:28:25',
            '名字(12345)',
            '2022-05-10 11:28:25 这行没有账号',
            '最后一行，没有末尾换行',
        ].join('\n');
        expect(
            LegacyQqImportAdapter.parse(
                `导出说明\n2022-05-10 11:28:25 Alice(12345)\n${content}`,
            )[0].content,
        ).toBe(content);
        expect(LegacyQqImportAdapter.parse('只有导出说明')).toEqual([]);
    });

    it('builds imported messages with original accounts, OOC flags and day boundaries', async () => {
        const [document] = await importFiles([
            { name: '旧版 QQ 导出', text: legacyLog },
        ]);
        expect(document.docName).toBe('旧版 QQ 导出');
        expect(document.chunks).toHaveLength(2);
        const messages = document.chunks.flatMap((chunk) => chunk.messages);
        expect(messages).toHaveLength(3);
        expect(messages[0]).toMatchObject({
            playerName: '名字',
            account: '12345',
            time: new Date(2022, 4, 10, 11, 28, 25),
            content: '第一行消息\n\n第二段消息',
            isOoc: false,
            isCommand: false,
        });
        expect(messages[1]).toMatchObject({
            account: 'player@example.com',
            isOoc: true,
        });
        expect(messages[2]).toMatchObject({
            account: '67890',
            isCommand: true,
            role: 'bot',
        });
    });
});
