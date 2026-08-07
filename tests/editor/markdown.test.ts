import { describe, expect, it } from 'vitest';
import { parseMarkdown, renderMarkdownToHtml } from '@/editor/markdown';

describe('markdown renderer', () => {
    it('renders the supported block and inline syntax', () => {
        const html = renderMarkdownToHtml(
            '# Heading\n\n**bold** ~~removed~~\n\n| A | B |\n| - | - |\n| 1 | 2 |',
        );

        expect(html).toContain('<h1>Heading</h1>');
        expect(html).toContain('<strong>bold</strong>');
        expect(html).toContain('<s>removed</s>');
        expect(html).toContain('<table>');
    });

    it('escapes raw HTML and rejects unsafe links', () => {
        const html = renderMarkdownToHtml(
            '<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))',
        );

        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('href="javascript:');
    });

    it('adds safe attributes to links', () => {
        const html = renderMarkdownToHtml('[OpenAI](https://openai.com)');

        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener noreferrer"');
    });

    it('exposes parsed tokens for structured exporters', () => {
        const tokens = parseMarkdown('## Heading\n\n`code`');

        expect(tokens.some((token) => token.type === 'heading_open')).toBe(
            true,
        );
        expect(tokens.some((token) => token.type === 'inline')).toBe(true);
    });
});
