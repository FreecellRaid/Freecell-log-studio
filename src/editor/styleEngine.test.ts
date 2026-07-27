import { describe, expect, it } from 'vitest';
import { computeStyleForMessage } from './styleEngine';
import type { Message } from '@/types/log';
import type { StyleRule } from '@/types/style';

const message: Message = {
    messageId: 'message-1',
    chunkId: 'chunk-1',
    messageIndex: 0,
    playerName: 'Alice',
    account: 'alice',
    time: new Date('2026-01-01T00:00:00Z'),
    content: 'hello',
    isOoc: false,
    isCommand: false,
    role: 'pl',
    note: '',
};

function rule(overrides: Partial<StyleRule>): StyleRule {
    return {
        ruleId: 'rule',
        ruleName: 'rule',
        filter: {},
        style: {},
        area: 'all',
        priority: 1,
        isActive: true,
        ...overrides,
    };
}

describe('style engine', () => {
    it('applies each effect to its configured area', () => {
        const result = computeStyleForMessage(message, [
            rule({ style: { color: '#123456' }, area: 'playerName' }),
            rule({ style: { bold: true }, area: 'content', priority: 2 }),
            rule({ style: { italic: true }, area: 'all', priority: 3 }),
        ]);

        expect(result.nameStyle).toEqual({
            color: '#123456',
            fontStyle: 'italic',
        });
        expect(result.contentStyle).toEqual({
            fontWeight: 'bold',
            fontStyle: 'italic',
        });
    });

    it('cascades only properties explicitly set by higher priority rules', () => {
        const result = computeStyleForMessage(message, [
            rule({
                style: { color: '#111111', bold: true },
                priority: 1,
            }),
            rule({ style: { color: '#222222' }, priority: 2 }),
        ]);

        expect(result.nameStyle).toEqual({
            color: '#222222',
            fontWeight: 'bold',
        });
        expect(result.contentStyle).toEqual(result.nameStyle);
    });

    it('ignores inactive and non-matching rules', () => {
        const result = computeStyleForMessage(message, [
            rule({ style: { bold: true }, isActive: false }),
            rule({
                style: { italic: true },
                filter: { playerName: 'Bob' },
            }),
        ]);

        expect(result).toEqual({ nameStyle: {}, contentStyle: {} });
    });
});
