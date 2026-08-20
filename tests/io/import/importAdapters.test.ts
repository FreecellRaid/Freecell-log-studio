import { describe, expect, it } from 'vitest';
import {
    CcfoliaImportAdapter,
    PaintedLogAdapter,
    PineappleImportAdapter,
    QqImportAdapter,
    SealchatImportAdapter,
    dispatchAdapter,
} from '@/io/import/importAdapters';

describe('QQ adapter', () => {
    const log = [
        '弥幽: 08-20 20:31:50',
        '第一条消息',
        '',
        '消息的第二段',
        '',
        'Freecell: 08-20 20:32:02',
        '(第二条消息)',
        '',
        '旧友: 2025-12-31 23:59:59',
        '去年的消息',
    ].join('\n');

    it('recognizes QQ exports and parses identities, times and multiline content', () => {
        expect(dispatchAdapter(log).id).toBe('qq-adapter');

        const rows = QqImportAdapter.parse(log);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toMatchObject({
            playerName: '弥幽',
            account: '',
            content: '第一条消息\n\n消息的第二段',
        });
        expect(rows[0].time).toEqual(
            new Date(new Date().getFullYear(), 7, 20, 20, 31, 50),
        );
        expect(rows[1]).toMatchObject({
            playerName: 'Freecell',
            account: '',
            content: '(第二条消息)',
        });
        expect(rows[2]).toMatchObject({
            playerName: '旧友',
            account: '',
            content: '去年的消息',
            time: new Date(2025, 11, 31, 23, 59, 59),
        });
    });

    it('does not include the month and day in the player name', () => {
        const currentYearLog = [
            'Alice: 08-20 20:31:50',
            'first',
            'Bob: 08-20 20:32:02',
            'second',
        ].join('\n');

        const adapter = dispatchAdapter(currentYearLog);
        expect(adapter.id).toBe('qq-adapter');
        expect(
            adapter.parse(currentYearLog).map((row) => row.playerName),
        ).toEqual(['Alice', 'Bob']);
    });
});

describe('painted log adapter', () => {
    const log = [
        '12:30:05 <Alice>: first line',
        'continued line',
        '<Bob>： second message',
    ].join('\n');

    it('recognizes timed and untimed entries with both colon variants', () => {
        expect(dispatchAdapter(log).id).toBe('painted-log-adapter');

        const rows = PaintedLogAdapter.parse(log);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            playerName: 'Alice',
            account: '',
            content: 'first line\ncontinued line',
        });
        expect(rows[0].time).toBeInstanceOf(Date);
        expect(rows[0].time?.getHours()).toBe(12);
        expect(rows[0].time?.getMinutes()).toBe(30);
        expect(rows[0].time?.getSeconds()).toBe(5);
        expect(rows[1]).toMatchObject({
            playerName: 'Bob',
            account: '',
            content: 'second message',
            time: undefined,
        });
    });
});

describe('Ccfolia adapter', () => {
    const log = `<!doctype html>
<html>
<head><title>ccfolia - logs</title></head>
<body>
<p style="color: rgb(136, 136, 136);">
  <span> [main] </span><span> Alice </span> : <span>Hello<br>second line</span>
</p>
<p style="color: #ff0000;">
  <span></span><span> Bob </span> : <span><strong>Bold</strong></span>
</p>
</body>
</html>`;

    it('uses document metadata for detection and extracts tabs, notes and line breaks', () => {
        expect(dispatchAdapter(log).id).toBe('ccfolia-adapter');

        expect(CcfoliaImportAdapter.parse(log)).toEqual([
            {
                playerName: 'Alice',
                content: 'Hello\nsecond line',
                note: '[main]',
                meta: { tab: 'rgb(136, 136, 136)' },
            },
            {
                playerName: 'Bob',
                content: 'Bold',
                note: '',
                meta: { tab: '#ff0000' },
            },
        ]);
    });
});

describe('pineapple adapter', () => {
    const log = [
        '[2026-04-08 10:20:30] <Alice|10001> first line',
        'continued line',
        '[2026-04-08 10:21:31] <Bob|account-b> second message',
    ].join('\n');

    it('extracts identity, timestamps and multiline content', () => {
        expect(dispatchAdapter(log).id).toBe('pineapple-adapter');

        const rows = PineappleImportAdapter.parse(log);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            playerName: 'Alice',
            account: '10001',
            content: 'first line\ncontinued line',
            time: new Date(2026, 3, 8, 10, 20, 30),
        });
        expect(rows[1]).toMatchObject({
            playerName: 'Bob',
            account: 'account-b',
            content: 'second message',
            time: new Date(2026, 3, 8, 10, 21, 31),
        });
    });
});

describe('SealChat adapter', () => {
    const log = [
        '频道: 测试频道 (channel-id)',
        '导出时间: 2026-04-08T11:00:00Z',
        '消息数量: 2',
        '---',
        '[2026-04-08 10:20:30] <Alice> first line',
        'continued line',
        '[2026-04-08 10:21:31] <Bob> second message',
    ].join('\n');

    it('recognizes header metadata and attaches channel data only to the first row', () => {
        expect(dispatchAdapter(log).id).toBe('sealchat-adapter');

        const rows = SealchatImportAdapter.parse(log);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({
            playerName: 'Alice',
            content: 'first line\ncontinued line',
            time: new Date(2026, 3, 8, 10, 20, 30),
            meta: { channel: '测试频道 (channel-id)' },
        });
        expect(rows[1]).toMatchObject({
            playerName: 'Bob',
            content: 'second message',
            time: new Date(2026, 3, 8, 10, 21, 31),
            meta: undefined,
        });
    });
});

describe('adapter dispatch', () => {
    it('rejects text without enough format evidence', () => {
        expect(() =>
            dispatchAdapter('plain text\nwithout log headers'),
        ).toThrow('无法识别该文件的格式');
    });
});
