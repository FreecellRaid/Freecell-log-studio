import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { importFiles } from '@/io/import/importService';
import { buildProjectFile, tryParseProjectFile } from '@/io/storage/project';

const protocol = {
    schema: 'freecell-log',
    version: 1,
    name: '团名',
    messages: [
        {
            id: 'platform-id',
            playerName: '普通昵称',
            account: '10001',
            time: '2026-10-09T20:00:00+08:00',
            content: '.正文',
            role: 'bot',
            isCommand: false,
            isOoc: true,
            meta: { channel: 'main', nested: { count: 1 } },
        },
    ],
};

describe('log import service', () => {
    it('accepts a single text message when its format is explicitly given', async () => {
        const text = 'Alice(10001) 2026-10-09 20:00:00\nhello\n';
        await expect(importFiles([{ name: 'a', text }])).rejects.toThrow(
            '无法识别',
        );
        const docs = await importFiles([
            { name: 'a', text, format: 'standard-adapter' },
        ]);
        expect(docs[0].chunks[0].messages[0]).toMatchObject({
            playerName: 'Alice',
            account: '10001',
            content: 'hello',
        });
        await expect(
            importFiles([
                {
                    name: 'a',
                    text: '<html>error</html>',
                    format: 'standard-adapter',
                },
            ]),
        ).rejects.toThrow('不符');
    });

    it('preserves explicit identities, times and flags while generating internal IDs', async () => {
        const docs = await importFiles([
            { name: 'file', text: JSON.stringify(protocol) },
        ]);
        expect(docs[0].docName).toBe('团名');
        const msg = docs[0].chunks[0].messages[0];
        expect(msg).toMatchObject({
            originalMessageId: 'platform-id',
            role: 'bot',
            isCommand: false,
            isOoc: true,
            content: '.正文',
            meta: protocol.messages[0].meta,
        });
        expect(msg.messageId).not.toBe('platform-id');
        expect(msg.time.toISOString()).toBe('2026-10-09T12:00:00.000Z');
    });

    it.each([
        { version: 2 },
        { messages: [{ content: 1 }] },
        { messages: [{ content: 'a', role: 'not-a-role' }] },
        { messages: [{ content: 'a', time: '2026-10-09T20:00:00' }] },
    ])('rejects malformed protocol data %j', async (override) => {
        await expect(
            importFiles([
                {
                    name: 'a',
                    text: JSON.stringify({ ...protocol, ...override }),
                },
            ]),
        ).rejects.toThrow('解析失败');
    });

    it('does not confuse project JSON with a remote message log or accept empty logs', async () => {
        await expect(
            importFiles([
                {
                    name: 'a',
                    text: JSON.stringify({ version: 2, documents: [] }),
                },
            ]),
        ).rejects.toThrow();
        await expect(
            importFiles([
                {
                    name: 'a',
                    text: JSON.stringify({ ...protocol, messages: [] }),
                },
            ]),
        ).rejects.toThrow('没有可导入');
        await expect(
            importFiles([
                { name: 'a', text: 'not json', format: 'freecell-log-v1' },
            ]),
        ).rejects.toThrow('不符合');
    });

    it('round trips source and nested metadata through project saving, including reactive objects', async () => {
        const source = { provider: 'oliva', id: 'log_1' };
        const documents = reactive(
            await importFiles([
                { name: 'a', text: JSON.stringify(protocol), source },
            ]),
        );
        const project = buildProjectFile({
            projectId: 'p',
            projectName: 'name',
            documents,
            styleRules: [],
            viewSettings: {
                hideOoc: false,
                hideCommand: false,
                enableMarkdown: false,
                colorMode: 'playerName',
            },
        });
        const restored = tryParseProjectFile(JSON.stringify(project));
        expect(restored?.documents[0].source).toEqual(source);
        expect(restored?.documents[0].chunks[0].messages[0]).toMatchObject({
            originalMessageId: 'platform-id',
            meta: protocol.messages[0].meta,
        });
        (
            documents[0].chunks[0].messages[0].meta!.nested as { count: number }
        ).count = 2;
        expect(project.documents[0].chunks[0].messages[0].meta).toEqual(
            protocol.messages[0].meta,
        );
    });
});
