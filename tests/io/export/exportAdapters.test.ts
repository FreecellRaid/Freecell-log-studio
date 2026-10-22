import { describe, expect, it } from 'vitest';
import type { ExportFormat, ExportRow, ExportMessageRow } from '@/types/export';
import { htmlAdapter, textAdapter } from '@/io/export/adapters/exportAdapters';
import { getPlaceholderValue } from '@/io/export/templateParser';

const format: ExportFormat = {
    formatId: 'format',
    formatName: 'format',
    fileExtension: '.txt',
    playerNameFormat: '{{name}}',
    accountFormat: '{{account}}',
    timeFormat: '{{time}}',
    imageTemplate: '{{image}}',
    messageTemplate: '{{name}}: {{content}}',
    messageSeparator: '\n',
    docSeparator: '',
    chunkSeparator: '',
};

const rows: ExportMessageRow[] = [
    {
        type: 'message',
        playerName: 'Alice',
        content: 'hello',
        nameStyle: { color: '#123456', bold: true },
        contentStyle: { italic: true },
    },
];

describe('styled export adapters', () => {
    it('resolves both colors in layout, field formats and message separators', () => {
        const colorRows: ExportRow[] = [
            {
                ...rows[0],
                account: 'alice',
                time: '12:00',
                contentStyle: { color: '#abcdef' },
            },
        ];
        const colorFormat: ExportFormat = {
            ...format,
            playerNameFormat: '{{nameColor}}/{{contentColor}}/{{name}}',
            accountFormat: '{{nameColor}}/{{contentColor}}/{{account}}',
            timeFormat: '{{nameColor}}/{{contentColor}}/{{time}}',
            messageTemplate:
                '{{name}}|{{account}}|{{time}}|{{nameColor}}|{{contentColor}}|{{content}}',
            messageSeparator: '|{{nameColor}}/{{contentColor}}\n',
        };
        expect(textAdapter(colorRows, colorFormat)).toBe(
            '#123456/#abcdef/Alice|#123456/#abcdef/alice|#123456/#abcdef/12:00|#123456|#abcdef|hello|#123456/#abcdef\n',
        );
        expect(htmlAdapter(colorRows, colorFormat)).toContain(
            '#123456/#abcdef/Alice',
        );
    });

    it('exports empty colors for missing styles and document or chunk separators', () => {
        expect(
            textAdapter(
                [
                    { type: 'documentSeparator', content: 'Doc' },
                    { type: 'chunkSeparator', content: 'Scene' },
                    { type: 'message', playerName: 'Alice', content: 'hello' },
                    {
                        type: 'message',
                        content: 'world',
                        nameStyle: {},
                        contentStyle: {},
                    },
                ],
                {
                    ...format,
                    playerNameFormat: '{{nameColor}}{{name}}{{contentColor}}',
                    docSeparator: '{{name}}[{{nameColor}}/{{contentColor}}]\n',
                    chunkSeparator:
                        '{{name}}[{{nameColor}}/{{contentColor}}]\n',
                    messageTemplate:
                        '{{name}}[{{nameColor}}/{{contentColor}}]{{content}}',
                },
            ),
        ).toBe('Doc[/]\nScene[/]\nAlice[/]hello\n[/]world\n');
    });

    it('does not interpret placeholders or replacement patterns in user data', () => {
        expect(
            getPlaceholderValue(
                'name',
                {
                    type: 'message',
                    content: '',
                    playerName: '{{nameColor}} $&',
                    nameStyle: { color: '#123456' },
                },
                { ...format, playerNameFormat: '{{name}} {{nameColor}}' },
            ),
        ).toBe('{{nameColor}} $& #123456');
    });

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
