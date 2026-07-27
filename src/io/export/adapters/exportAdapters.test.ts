import { describe, expect, it } from 'vitest';
import type { ExportFormat, ExportRow } from '@/types/export';
import { htmlAdapter, textAdapter } from './exportAdapters';

const format: ExportFormat = {
    formatId: 'format',
    formatName: 'format',
    fileExtension: '.txt',
    playerNameFormat: '{{name}}',
    accountFormat: '{{account}}',
    timeFormat: '{{time}}',
    messageTemplate: '{{name}}: {{content}}',
    messageSeparator: '\n',
    docSeparator: '',
    chunkSeparator: '',
};

const rows: ExportRow[] = [
    {
        type: 'message',
        playerName: 'Alice',
        content: 'hello',
        nameStyle: { color: '#123456', bold: true },
        contentStyle: { italic: true },
    },
];

describe('styled export adapters', () => {
    it('keeps style in HTML output', () => {
        const html = htmlAdapter(rows, format);
        expect(html).toContain('color: #123456; font-weight: bold');
        expect(html).toContain('font-style: italic');
    });

    it('keeps text output free of style markup', () => {
        expect(textAdapter(rows, format)).toBe('Alice: hello\n');
    });
});
