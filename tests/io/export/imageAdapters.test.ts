import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    textAdapter,
    htmlAdapter,
    docAdapter,
} from '@/io/export/adapters/exportAdapters';
import { docxAdapter } from '@/io/export/adapters/docxAdapter';
import {
    prepareDocxImage,
    fitDocxImage,
} from '@/io/export/adapters/docxImages';
import { createExportResourceContext } from '@/io/export/exportResources';
import type {
    ExportFormat,
    ExportImageRow,
    ExportResource,
    ExportRow,
} from '@/types/export';
import fixtures from '../../fixtures/export/images.json';
import { docxEntries } from '../../helpers/docxArchive';
const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVEkAAAAASUVORK5CYII=';
const pngBlob = () =>
    new Blob([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], {
        type: 'image/png',
    });
const format: ExportFormat = {
    formatId: 'test',
    formatName: '测试',
    fileExtension: '.txt',
    playerNameFormat: '{{name}}',
    accountFormat: '{{account}}',
    timeFormat: '{{time}}',
    messageTemplate: '{{name}}:{{content}}',
    imageTemplate: '{{image}}',
    messageSeparator: '\n',
    docSeparator: '',
    chunkSeparator: '',
};
const image: ExportImageRow = {
    type: 'image',
    playerName: '甲',
    image: { imageId: 'i', resourceId: 'r', name: '地图' },
};
const local = (extra: Partial<ExportResource> = {}): ExportResource => ({
    type: 'image',
    resourceId: 'r',
    blob: pngBlob(),
    mimeType: 'image/png',
    width: 1,
    height: 1,
    sourceUrl: 'https://example.com/a.png?x=1&y=2',
    ...extra,
});
const context = (resource: ExportResource = local()) =>
    createExportResourceContext([resource]);
afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('具体图片导出适配器', () => {
    it('TEXT 在 Markdown 和 BBCode 模板中优先插入二进制 URI，链接 token 保持纯文本', async () => {
        const resources = context();
        expect(
            await textAdapter(
                [image],
                { ...format, imageTemplate: '![{{imageName}}]({{image}})' },
                { resources },
            ),
        ).toBe(`![地图](data:image/png;base64,${png})\n`);
        expect(
            await textAdapter(
                [image],
                { ...format, imageTemplate: '[img]{{image}}[/img]' },
                { resources },
            ),
        ).toBe(`[img]data:image/png;base64,${png}[/img]\n`);
        expect(
            await textAdapter(
                [image],
                { ...format, imageTemplate: '{{imageUrl}}' },
                { resources },
            ),
        ).toBe('https://example.com/a.png?x=1&y=2\n');
    });
    it('HTML/DOC 内嵌本地图片，按原尺寸输出且限制宽度，名称与属性独立转义', async () => {
        const resources = context(local({ width: 1600, height: 900 }));
        const row = {
            ...image,
            image: { ...image.image, name: '\" onerror=\"<script>' },
        };
        for (const adapter of [htmlAdapter, docAdapter]) {
            const html = await adapter([row], format, { resources });
            expect(html).toContain(`src="data:image/png;base64,${png}"`);
            expect(html).toContain('width="1600" height="900"');
            expect(html).toContain('max-width:100%;height:auto');
            expect(html).toContain('alt="&quot; onerror=&quot;&lt;script&gt;"');
            expect(html).not.toContain(' onerror="');
        }
    });
    it('仅链接资源：TEXT 输出链接，HTML 使用远程 img，DOCX 只输出链接且不发起下载', async () => {
        const resources = context(local({ blob: undefined }));
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        expect(await textAdapter([image], format, { resources })).toBe(
            'https://example.com/a.png?x=1&y=2\n',
        );
        expect(await htmlAdapter([image], format, { resources })).toContain(
            'src="https://example.com/a.png?x=1&amp;y=2"',
        );
        const files = await docxEntries(
            await docxAdapter([image], format, { resources }),
        );
        expect(
            [...files.keys()].filter((name) => name.startsWith('word/media/')),
        ).toEqual([]);
        expect(files.get('word/document.xml')!.toString()).toContain(
            'https://example.com/a.png?x=1&amp;y=2',
        );
        expect(fetch).not.toHaveBeenCalled();
    });
    it('缺失、非法链接及本地编码错误均按单张降级，保留其他正文', async () => {
        const rows: ExportRow[] = [
            { type: 'message', content: '正文', playerName: '甲' },
            image,
        ];
        expect(await textAdapter(rows, format)).toBe('甲:正文\n[图片]\n');
        expect(
            await htmlAdapter([image], format, {
                resources: context(
                    local({
                        blob: undefined,
                        sourceUrl: 'javascript:alert(1)',
                    }),
                ),
            }),
        ).toContain('[图片]');
        const resources = context();
        vi.spyOn(resources, 'getDataUri').mockRejectedValue(
            new Error('编码失败'),
        );
        expect(await textAdapter([image], format, { resources })).toBe(
            'https://example.com/a.png?x=1&y=2\n',
        );
        const resourcesWithoutUrl = context(local({ sourceUrl: undefined }));
        vi.spyOn(resourcesWithoutUrl, 'getDataUri').mockRejectedValue(
            new Error('编码失败'),
        );
        expect(
            await htmlAdapter(rows, format, { resources: resourcesWithoutUrl }),
        ).toContain('[图片]');
    });
    it('不使用 image token 的模板不编码图片，imageUrl 在 HTML 中不生成标签', async () => {
        const resources = context();
        const encode = vi.spyOn(resources, 'getDataUri');
        expect(
            await textAdapter(
                [image],
                { ...format, imageTemplate: '附件：{{imageName}}' },
                { resources },
            ),
        ).toBe('附件：地图\n');
        const html = await htmlAdapter(
            [image],
            { ...format, imageTemplate: '{{imageUrl}}' },
            { resources },
        );
        expect(html).not.toContain('<img');
        expect(encode).not.toHaveBeenCalled();
        const files = await docxEntries(
            await docxAdapter(
                [image],
                { ...format, imageTemplate: '自定义占位' },
                { resources },
            ),
        );
        expect(files.get('word/document.xml')!.toString()).toContain(
            '自定义占位',
        );
        expect([...files.keys()].some((name) => name.endsWith('.png'))).toBe(
            false,
        );
    });
    it('重复图片保持模板顺序并复用 URI 编码', async () => {
        const resources = context();
        const encode = vi.spyOn(resources, 'getDataUri');
        const html = await htmlAdapter(
            [image],
            { ...format, imageTemplate: '前{{image}}中{{image}}后' },
            { resources },
        );
        expect(html.match(/<img /g)).toHaveLength(2);
        expect(html).toMatch(/前<img[\s\S]*中<img[\s\S]*后/);
        expect(encode).toHaveBeenCalledOnce();
    });
    it('DOCX 实际内嵌图片并保留模板前后文字、颜色和 Markdown 消息', async () => {
        const rows: ExportRow[] = [
            {
                type: 'message',
                playerName: '甲',
                content: '**加粗**',
                nameStyle: { color: '#123456' },
            },
            image,
        ];
        const files = await docxEntries(
            await docxAdapter(
                rows,
                { ...format, imageTemplate: '前{{image}}后' },
                { resources: context(), enableMarkdown: true },
            ),
        );
        const media = [...files.keys()].filter(
            (name) => name.startsWith('word/media/') && name.endsWith('.png'),
        );
        expect(media).toHaveLength(1);
        expect(files.get(media[0]!)!).toEqual(Buffer.from(png, 'base64'));
        const xml = files.get('word/document.xml')!.toString();
        expect(xml).toMatch(/前[\s\S]*<w:drawing>[\s\S]*后/);
        expect(xml).toContain('123456');
        expect(xml).toContain('加粗');
        expect(xml).toContain('<w:b');
        expect(files.get('word/_rels/document.xml.rels')!.toString()).toContain(
            media[0]!.replace('word/', ''),
        );
        expect(xml).toContain('name="地图"');
    });
    it('DOCX 重复引用只写一份媒体；大图等比缩小而不放大小图', async () => {
        const files = await docxEntries(
            await docxAdapter([image, image], format, {
                resources: context(local({ width: 1600, height: 900 })),
            }),
        );
        expect(
            [...files.keys()].filter(
                (name) =>
                    name.startsWith('word/media/') && name.endsWith('.png'),
            ),
        ).toHaveLength(1);
        const xml = files.get('word/document.xml')!.toString();
        expect(xml.match(/<w:drawing>/g)).toHaveLength(2);
        const extent = xml.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)!;
        expect(Number(extent[1]) / 9525).toBeLessThan(602);
        expect(Number(extent[2]) / Number(extent[1])).toBeCloseTo(
            900 / 1600,
            4,
        );
        expect(fitDocxImage(320, 160)).toEqual({ width: 320, height: 160 });
        expect(fitDocxImage(100, 20000).height).toBeLessThan(931);
    });
    it.each(['jpeg', 'gif'] as const)(
        'DOCX 保留 %s 原始二进制并登记正确媒体格式',
        async (key) => {
            const fixture = fixtures[key];
            const blob = new Blob(
                [Uint8Array.from(atob(fixture.base64), (c) => c.charCodeAt(0))],
                { type: fixture.mimeType },
            );
            const files = await docxEntries(
                await docxAdapter([image], format, {
                    resources: context(
                        local({
                            blob,
                            mimeType: fixture.mimeType,
                            width: fixture.width,
                            height: fixture.height,
                        }),
                    ),
                }),
            );
            const extension = key === 'jpeg' ? '.jpg' : '.gif';
            const path = [...files.keys()].find(
                (name) =>
                    name.startsWith('word/media/') && name.endsWith(extension),
            );
            expect(path).toBeDefined();
            expect(files.get(path!)!).toEqual(
                Buffer.from(fixture.base64, 'base64'),
            );
            expect(files.get('[Content_Types].xml')!.toString()).toContain(
                fixture.mimeType,
            );
        },
    );
    it('DOCX 损坏图片降级成链接或占位，不影响其他段落', async () => {
        const files = await docxEntries(
            await docxAdapter(
                [image, { type: 'message', content: '继续正文' }],
                format,
                {
                    resources: context(
                        local({ blob: new Blob(['not an image']) }),
                    ),
                },
            ),
        );
        const xml = files.get('word/document.xml')!.toString();
        expect(xml).toContain('https://example.com/a.png?x=1&amp;y=2');
        expect(xml).toContain('继续正文');
        expect(xml).not.toContain('<w:drawing>');
        const missing = await docxEntries(await docxAdapter([image], format));
        expect(missing.get('word/document.xml')!.toString()).toContain(
            '[图片]',
        );
    });
    it('WebP 按原始像素转成 PNG 后嵌入，转换结束释放解码器', async () => {
        const close = vi.fn();
        const draw = vi.fn();
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(async () => ({ width: 1600, height: 900, close })),
        );
        const canvas = {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage: draw }),
            toBlob: (done: (blob: Blob) => void) => done(pngBlob()),
        };
        vi.stubGlobal('document', { createElement: () => canvas });
        const blob = new Blob([new TextEncoder().encode('RIFF1234WEBPdata')], {
            type: 'image/webp',
        });
        const prepared = await prepareDocxImage(
            local({ blob, mimeType: 'image/webp', width: 480, height: 270 }),
        );
        expect(prepared.type).toBe('png');
        expect(canvas.width).toBe(1600);
        expect(canvas.height).toBe(900);
        expect(draw).toHaveBeenCalledOnce();
        expect(close).toHaveBeenCalledOnce();
        expect(prepared.data).toEqual(
            new Uint8Array(Buffer.from(png, 'base64')),
        );
        const files = await docxEntries(
            await docxAdapter([image], format, {
                resources: context(local({ blob, mimeType: 'image/webp' })),
            }),
        );
        expect(
            [...files.keys()].some(
                (name) =>
                    name.startsWith('word/media/') && name.endsWith('.png'),
            ),
        ).toBe(true);
    });
    it('WebP 转换失败释放解码器并按单图降级，尺寸无效时拒绝生成图片', async () => {
        const close = vi.fn();
        vi.stubGlobal(
            'createImageBitmap',
            vi.fn(async () => ({ width: 100, height: 50, close })),
        );
        vi.stubGlobal('document', {
            createElement: () => ({
                width: 0,
                height: 0,
                getContext: () => null,
            }),
        });
        const blob = new Blob([new TextEncoder().encode('RIFF1234WEBPdata')]);
        await expect(prepareDocxImage(local({ blob }))).rejects.toThrow();
        expect(close).toHaveBeenCalledOnce();
        expect(() => fitDocxImage(Infinity, 10)).toThrow();
        expect(() => fitDocxImage(-1, 10)).toThrow();
    });
});
