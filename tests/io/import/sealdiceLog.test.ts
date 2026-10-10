import { describe, expect, it, vi } from 'vitest';
import { deflateSync } from 'node:zlib';
import { importFiles } from '@/io/import/importService';
import { parseSealdiceLog } from '@/io/import/sealdiceLog';
import { readRemoteLog } from '@/io/import/remoteReader';
import { resolveRemoteInput, buildRemoteLogLink } from '@/io/import/remoteLink';

const log = {
    version: 101,
    items: [
        {
            id: 12,
            nickname: 'KP',
            IMUserId: '123',
            time: 1791030093,
            message: '第一行\r\n第二行',
            isDice: false,
            commandId: 3,
            rawMsgId: 'raw-12',
        },
        {
            id: 13,
            nickname: '严茫熙',
            IMUserId: '456',
            time: 1791030094,
            message: '检定成功',
            isDice: true,
            commandInfo: { result: 23 },
        },
    ],
};

describe('SealDice logs', () => {
    it('recognizes original HTTP/HTTPS links and round trips passwords exactly once', () => {
        const request = {
            source: 'sealdice',
            id: 'kg94',
            password: '48+%20&#',
        };
        expect(
            resolveRemoteInput(
                'http://log.weizaima.com/?key=kg94#48%2B%2520%26%23',
            ),
        ).toEqual(request);
        expect(
            resolveRemoteInput(
                buildRemoteLogLink('https://editor.example', request),
            ),
        ).toEqual(request);
        expect(() =>
            resolveRemoteInput('https://log.weizaima.com/?key=a&key=b#123'),
        ).toThrow('重复');
        expect(() =>
            resolveRemoteInput('https://log.weizaima.com/?key=a'),
        ).toThrow('密码');
        expect(() =>
            resolveRemoteInput('http://other.example/?key=a#123'),
        ).toThrow('HTTPS');
    });

    it('downloads over HTTPS, inflates zlib and retains identities, times and bot roles', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            Response.json({
                client: 'SealDice',
                name: '测试团',
                data: deflateSync(JSON.stringify(log)).toString('base64'),
            }),
        );
        const entry = await readRemoteLog(
            { source: 'sealdice', id: 'a&b', password: 'p+1' },
            { fetch: fetcher },
        );
        const url = new URL(String(fetcher.mock.calls[0][0]));
        expect(url.protocol).toBe('https:');
        expect(url.searchParams.get('key')).toBe('a&b');
        expect(url.searchParams.get('password')).toBe('p+1');
        const [doc] = await importFiles([entry]);
        expect(doc.docName).toBe('测试团');
        expect(doc.source).toEqual({ provider: 'sealdice', id: 'a&b' });
        const messages = doc.chunks.flatMap((chunk) => chunk.messages);
        expect(messages).toHaveLength(2);
        expect(messages[0]).toMatchObject({
            account: '123',
            originalMessageId: '12',
            role: 'gm',
            content: '第一行\n第二行',
        });
        expect(messages[0].time.getTime()).toBe(1791030093000);
        expect(messages[0].meta).toMatchObject({
            sealdice: { rawMsgId: 'raw-12', commandId: 3 },
        });
        expect(messages[1].role).toBe('bot');
        expect(JSON.stringify(doc)).not.toContain('p+1');
    });

    it('auto detects locally imported SealDice JSON', async () => {
        const [doc] = await importFiles([
            { name: 'local.json', text: JSON.stringify(log) },
        ]);
        expect(doc.chunks.flatMap((chunk) => chunk.messages)).toHaveLength(2);
        expect(parseSealdiceLog('{"documents":[]}')).toBeNull();
    });

    it.each([
        { ...log.items[0], message: 1 },
        { ...log.items[0], isDice: 'false' },
        { ...log.items[0], time: '2026-10-03' },
        { ...log.items[0], id: {} },
    ])('rejects malformed messages without partially importing', (item) => {
        expect(() =>
            parseSealdiceLog(JSON.stringify({ version: 101, items: [item] })),
        ).toThrow('无效');
    });

    it('bounds decompressed size and reports damaged payloads and unsupported encodings', async () => {
        const request = { source: 'sealdice', id: 'a', password: '123' };
        const fetchResponse = (response: unknown) =>
            vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
        await expect(
            readRemoteLog(request, {
                maxBytes: 500,
                fetch: fetchResponse({
                    client: 'SealDice',
                    data: deflateSync('a'.repeat(10000)).toString('base64'),
                }),
            }),
        ).rejects.toThrow('解压后');
        await expect(
            readRemoteLog(request, {
                fetch: fetchResponse({ client: 'SealDice', data: 'AAAA' }),
            }),
        ).rejects.toThrow('解压失败');
        await expect(
            readRemoteLog(request, {
                fetch: fetchResponse({ client: 'Parquet', data: 'AAAA' }),
            }),
        ).rejects.toThrow('Parquet');
        await expect(
            readRemoteLog(request, {
                fetch: fetchResponse({ error: 'invalid password' }),
            }),
        ).rejects.toThrow('密码');
    });
});
