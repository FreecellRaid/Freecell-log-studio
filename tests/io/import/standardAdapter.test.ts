import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dispatchAdapter } from '@/io/import/importAdapters';
import { buildLogDocument } from '@/io/import/parser';

const fixturePath = fileURLToPath(
    new URL('../../fixtures/import/standard-adapter.txt', import.meta.url),
);
const standardLog = readFileSync(fixturePath, 'utf8');

describe('standard import adapter', () => {
    it('recognizes and parses the collected standard log variants', () => {
        const adapter = dispatchAdapter(standardLog);
        const rows = adapter.parse(standardLog);

        expect(adapter.id).toBe('standard-adapter');
        expect(rows).toHaveLength(16);
        expect(
            rows.map(({ playerName, account }) => ({ playerName, account })),
        ).toEqual([
            { playerName: 'StandardMessage', account: 'account' },
            { playerName: 'PlayerNameWith(brackets)', account: '123456' },
            {
                playerName: 'AccountWithBrackets',
                account: 'accountWith(brackets)',
            },
            { playerName: '', account: 'PlayerWithoutName' },
            { playerName: 'MessageWithSpace', account: 'account' },
            { playerName: 'PlayerWithoutAccount', account: '' },
            { playerName: 'NonStandardTime1', account: 'account' },
            { playerName: 'NonStandardTime2', account: 'account' },
            { playerName: 'NonStandardTime3', account: 'account' },
            { playerName: 'UndefinedCommand', account: 'account' },
            { playerName: 'CommandCN', account: 'account' },
            { playerName: 'CommandEN', account: 'account' },
            { playerName: 'Command/', account: 'account' },
            { playerName: 'Command\\', account: 'account' },
            { playerName: 'OocCN', account: 'account' },
            { playerName: 'OocEN', account: 'account' },
        ]);

        expect(rows[0].content).toBe('标准消息格式');
        expect(rows[6].time).toEqual(new Date(2026, 3, 8, 0, 0, 10));
        expect(rows[7].time).toEqual(new Date(2026, 3, 8, 0, 0, 10));
        expect(rows[8].time).toBeInstanceOf(Date);
        expect(rows[8].time?.getHours()).toBe(0);
        expect(rows[8].time?.getMinutes()).toBe(0);
        expect(rows[8].time?.getSeconds()).toBe(10);
    });

    it('applies identity fallbacks and command/OOC flags when building messages', () => {
        const rows = dispatchAdapter(standardLog).parse(standardLog);
        const document = buildLogDocument(rows, 'standard-adapter.txt', 0);
        const messages = document.chunks.flatMap((chunk) => chunk.messages);

        expect(messages).toHaveLength(16);
        expect(messages[3]).toMatchObject({
            playerName: 'PlayerWithoutName',
            account: 'PlayerWithoutName',
        });
        expect(messages[5]).toMatchObject({
            playerName: 'PlayerWithoutAccount',
            account: 'PlayerWithoutAccount',
        });

        expect(messages.slice(9, 14).every((message) => message.isCommand)).toBe(
            true,
        );
        expect(messages.slice(14).every((message) => message.isOoc)).toBe(true);
        expect(messages.slice(0, 9).every((message) => !message.isCommand)).toBe(
            true,
        );
    });
});
