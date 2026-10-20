import { describe, expect, it } from 'vitest';
import { parseContent } from '@/io/import/contentParser';

const image =
    '[CQ:image,file=map.png,url=https://example.com/map.png?x=1&amp;y=2,name=地图&#44;一]';

describe('content extraction', () => {
    it('extracts CQ images before cleaning, preserving names, URLs and source order', () => {
        const result = parseContent(
            `正文${image}\n[CQ:image,file=local.image]`,
            { syntax: 'cq' },
        );
        expect(result.content).toBe('正文');
        expect(result.resources).toEqual([
            {
                type: 'image',
                name: '地图,一',
                url: 'https://example.com/map.png?x=1&y=2',
                original: image,
                source: 'cq',
            },
            {
                type: 'image',
                name: 'local.image',
                url: undefined,
                original: '[CQ:image,file=local.image]',
                source: 'cq',
            },
        ]);
    });
    it.each(['cq', 'mixed'] as const)(
        'decodes CQ escapes only after recognition in %s syntax',
        (syntax) => {
            const escaped =
                '&#91;CQ:image,file=example.png&#93; &amp;#91; &#44;';
            const result = parseContent(escaped, { syntax });
            expect(result.resources).toBeUndefined();
            expect(result.content).toContain('[CQ:image,file=example.png]');
            expect(result.content).toContain('&#91;');
        },
    );
    it('removes unsupported CQ codes while preserving incomplete text', () => {
        const text =
            '[CQ:at,qq=123] [CQ:unknown,value=x] [CQ:image,file=broken';
        expect(parseContent(text, { syntax: 'cq' })).toEqual({
            content: '[CQ:image,file=broken',
        });
    });
    it('supports an HTTP URL in the CQ file field and prefers url when present', () => {
        const result = parseContent(
            '[CQ:image,file=https://example.com/a.png][CQ:image,file=local,url=https://example.com/b.png]',
            { syntax: 'cq' },
        );
        expect(result.resources?.map((item) => item.url)).toEqual([
            'https://example.com/a.png',
            'https://example.com/b.png',
        ]);
    });
    it('extracts HTML images and decodes quoted attributes and entities without executing hidden content', () => {
        const result = parseContent(
            `<p>Hello &amp; world<br>second<img ALT='地图 > 一' SRC="./a.png?x=1&amp;y=2"></p><script><img src="bad.png">evil()</script><style>hidden</style><div>end</div>`,
            { syntax: 'html' },
        );
        expect(result.content).toBe('Hello & world\nsecond\n\nend');
        expect(result.resources).toHaveLength(1);
        expect(result.resources?.[0]).toMatchObject({
            name: '地图 > 一',
            url: './a.png?x=1&y=2',
            source: 'html',
        });
    });
    it('retains unresolved and empty HTML images as placeholders', () => {
        const result = parseContent(
            '<img src="file:///tmp/map.png"><IMG alt="缺失图片">',
            { syntax: 'html' },
        );
        expect(result.content).toBe('');
        expect(result.resources).toHaveLength(2);
        expect(result.resources?.[1]).toMatchObject({
            name: '缺失图片',
            url: undefined,
        });
    });
    it('keeps interleaved CQ and HTML images in original order', () => {
        const result = parseContent(
            `${image}<img src="b.png" alt="第二张">[CQ:image,file=third.image]`,
            { syntax: 'mixed' },
        );
        expect(result.content).toBe('');
        expect(result.resources?.map((item) => item.name)).toEqual([
            '地图,一',
            '第二张',
            'third.image',
        ]);
    });
    it('leaves Markdown image syntax unchanged and does not reparse escaped HTML', () => {
        const text =
            '![地图](https://example.com/a.png) &lt;img src="example.png"&gt;';
        expect(parseContent(text, { syntax: 'mixed' })).toEqual({
            content:
                '![地图](https://example.com/a.png) <img src="example.png">',
        });
    });
    it.each(['html', 'mixed'] as const)(
        'extracts plain text from unsupported HTML tags in %s syntax',
        (syntax) => {
            expect(
                parseContent('说明 <account>123</account> 保留', {
                    syntax,
                }),
            ).toEqual({ content: '说明 123 保留' });
        },
    );
    it('extracts supported images inside unsupported HTML containers while removing other CQ codes', () => {
        const result = parseContent(
            '<section><custom>正文[CQ:face,id=1]</custom><figure><img src="map.png" alt="地图"></figure></section>',
            { syntax: 'mixed' },
        );
        expect(result.content).toBe('正文');
        expect(result.resources).toHaveLength(1);
        expect(result.resources?.[0]).toMatchObject({
            name: '地图',
            url: 'map.png',
        });
        expect(
            parseContent('[CQ:at,qq=123][CQ:unknown,value=x]', {
                syntax: 'mixed',
            }),
        ).toEqual({ content: '' });
    });
    it('keeps plain text and explicit CQ examples inside HTML literal', () => {
        const text = `${image}<img src="a.png">`;
        expect(parseContent(text, { syntax: 'plain' })).toEqual({
            content: text,
        });
        expect(
            parseContent(`<p>${image}</p>`, { syntax: 'html' }).resources,
        ).toBeUndefined();
    });
});
