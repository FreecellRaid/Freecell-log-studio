import { describe, expect, it } from 'vitest';
import type { ExportFormat, ExportRow } from '@/types/export';
import { htmlAdapter, textAdapter } from '@/io/export/adapters/exportAdapters';

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

    it('renders only message content as Markdown when enabled', () => {
        const markdownRows: ExportRow[] = [
            {
                type: 'message',
                playerName: '**Alice**',
                content: '**hello**',
            },
        ];

        const html = htmlAdapter(markdownRows, format, {
            enableMarkdown: true,
        });

        expect(html).toContain('**Alice**');
        expect(html).toContain('<strong>hello</strong>');
        expect(textAdapter(markdownRows, format)).toBe(
            '**Alice**: **hello**\n',
        );
    });

    it('keeps Markdown source in non-text adapters when disabled', () => {
        const markdownRows: ExportRow[] = [
            { type: 'message', playerName: 'Alice', content: '**hello**' },
        ];

        const html = htmlAdapter(markdownRows, format, {
            enableMarkdown: false,
        });

        expect(html).toContain('**hello**');
        expect(html).not.toContain('<strong>hello</strong>');
    });

    it('allows DOCX export with parsed Markdown content', async () => {
        const { docxAdapter } =
            await import('@/io/export/adapters/docxAdapter');
        const markdownRows: ExportRow[] = [
            {
                type: 'message',
                playerName: 'Alice',
                content: '# Heading\n\n**bold** and `code`',
            },
        ];

        const result = await docxAdapter(markdownRows, format, {
            enableMarkdown: true,
        });

        expect(result).toBeInstanceOf(Blob);
        expect(result.size).toBeGreaterThan(0);
    });
});
