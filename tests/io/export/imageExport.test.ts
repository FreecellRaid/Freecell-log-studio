import { describe, expect, it, vi } from 'vitest';
import { flattenLogToRows } from '@/io/export/flattener';
import { renderExportDocument } from '@/io/export/exportRender';
import {
    createExportResourceContext,
    prepareExportResources,
} from '@/io/export/exportResources';
import {
    DEFAULT_IMAGE_PLACEHOLDER,
    normalizeExportFormat,
    type ExportFormat,
    type ExportImageRow,
} from '@/types/export';
import { imageProject } from '../../helpers/imageProject';
const format: ExportFormat = {
    formatId: 'test',
    formatName: '测试',
    fileExtension: '.txt',
    playerNameFormat: '<{{name}}>',
    accountFormat: '({{account}})',
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
    account: '账号',
    time: '12:00',
    nameStyle: { color: '#112233' },
    contentStyle: { color: '#445566' },
    image: { imageId: 'i', resourceId: 'r', name: '地图' },
};
const settings = {
    hideOoc: false,
    hideCommand: false,
    enableMarkdown: false,
    colorMode: 'playerName' as const,
};
describe('通用图片导出', () => {
    it('正文后逐张生成图片行，纯图片消息不产生空正文，保持附件顺序和元信息', () => {
        const { documents, first } = imageProject();
        const rows = flattenLogToRows(documents, settings, []);
        const contentRows = rows.filter(
            (row) => row.type === 'message' || row.type === 'image',
        );
        expect(contentRows.map((row) => row.type)).toEqual([
            'message',
            'image',
            'image',
            'image',
            'message',
            'image',
            'image',
        ]);
        const images = rows.filter((row) => row.type === 'image');
        expect(images.map((row) => row.image.imageId)).toEqual([
            'first-shared',
            'first-local',
            'first-shared-copy',
            'last-shared',
            'last-remote',
        ]);
        expect(images[0]?.playerName).toBe(first.playerName);
        expect(images[0]).not.toHaveProperty('content');
        expect(images[0]?.image).not.toBe(first.images![0]);
    });
    it('隐藏场外和指令消息时同时排除其图片', () => {
        const { documents, first, last } = imageProject();
        first.isOoc = true;
        last.isCommand = true;
        const rows = flattenLogToRows(
            documents,
            { ...settings, hideOoc: true, hideCommand: true },
            [],
        );
        expect(rows.filter((row) => row.type === 'image')).toEqual([]);
        expect(rows.find((row) => row.type === 'message')?.content).toBe(
            '普通消息',
        );
    });
    it('图片名称、链接和普通消息 token 都只作为数据替换，图片行没有 content', () => {
        const context = createExportResourceContext([
            {
                type: 'image',
                resourceId: 'r',
                sourceUrl: 'https://example.com/a.png?a=1&b=2',
            },
        ]);
        const result = renderExportDocument(
            [{ ...image, image: { ...image.image, name: '{{image}} $&' } }],
            {
                ...format,
                imageTemplate:
                    '{{imageName}}|{{imageUrl}}|{{name}}|{{account}}|{{time}}|{{nameColor}}|{{contentColor}}|{{content}}',
            },
            context,
        );
        expect(result.blocks[0]?.plainText).toBe(
            '{{image}} $&|https://example.com/a.png?a=1&b=2|<甲>|(账号)|12:00|#112233|#445566|',
        );
        expect(result.blocks[0]?.type).toBe('image');
    });
    it('image 保留二进制与链接语义，不提前编码，也不解析模板替换后的名称', () => {
        const blob = new Blob(['image'], { type: 'image/png' });
        const context = createExportResourceContext([
            {
                type: 'image',
                resourceId: 'r',
                blob,
                sourceUrl: 'https://example.com/a.png',
            },
        ]);
        const result = renderExportDocument(
            [image],
            { ...format, imageTemplate: '前{{imageName}}:{{image}}后' },
            context,
        );
        expect(
            result.blocks[0]?.segments.find(
                (segment) => segment.type === 'image',
            ),
        ).toMatchObject({
            type: 'image',
            imageName: '地图',
            resource: { blob, sourceUrl: 'https://example.com/a.png' },
        });
        expect(result.blocks[0]?.trailingPlainText).toBe('\n');
    });
    it.each(['', '{{content}}', '{{imageUrl}}', '{{unknown}}'])(
        '无有效内容的图片模板 %s 回退到通用占位',
        (template) => {
            expect(
                renderExportDocument([image], {
                    ...format,
                    imageTemplate: template,
                }).blocks[0]?.plainText,
            ).toBe(DEFAULT_IMAGE_PLACEHOLDER);
        },
    );
    it('自定义占位文本和缺失资源继续生成有效图片行，不影响普通消息模板', () => {
        expect(
            renderExportDocument([image], {
                ...format,
                imageTemplate: '附件：{{imageName}}',
            }).blocks[0]?.plainText,
        ).toBe('附件：地图');
        const block = renderExportDocument([image], format).blocks[0];
        expect(block?.segments[0]).toMatchObject({
            type: 'image',
            value: DEFAULT_IMAGE_PLACEHOLDER,
        });
        const normal = renderExportDocument(
            [{ type: 'message', content: '正文', playerName: '甲' }],
            {
                ...format,
                messageTemplate:
                    '{{imageName}}{{imageUrl}}{{image}}{{content}}',
            },
        );
        expect(normal.blocks[0]?.plainText).toBe('正文');
    });
    it('旧模板仅补充新字段，用户设置的空模板也保留到渲染阶段处理', () => {
        const { imageTemplate: _old, ...legacy } = format;
        expect(normalizeExportFormat(legacy as ExportFormat)).toMatchObject({
            ...legacy,
            imageTemplate: '{{image}}',
        });
        expect(
            normalizeExportFormat({ ...format, imageTemplate: '' })
                .imageTemplate,
        ).toBe('');
    });
    it('资源准备去重，单项失败降级，不包含缩略图；Base64 仅按需计算且共享结果', async () => {
        const blob = new Blob(['original'], { type: 'image/png' });
        const read = vi.fn(async (id: string) => {
            if (id === 'bad') throw new Error('数据库异常');
            return {
                type: 'image' as const,
                resourceId: id,
                blob,
                thumbnail: new Blob(['small']),
                updatedAt: 1,
            };
        });
        const rows = [
            image,
            { ...image, image: { ...image.image, imageId: 'copy' } },
            { ...image, image: { ...image.image, resourceId: 'bad' } },
        ];
        const encode = vi.spyOn(blob, 'arrayBuffer');
        const context = await prepareExportResources(rows, {
            readResource: read,
        });
        expect(read).toHaveBeenCalledTimes(2);
        expect(encode).not.toHaveBeenCalled();
        expect(context.resources.get('r')).not.toHaveProperty('thumbnail');
        expect(context.resources.get('bad')?.error).toBe('资源读取失败');
        const first = context.getDataUri('r');
        const second = context.getDataUri('r');
        expect(first).toBe(second);
        expect(await first).toBe('data:image/png;base64,b3JpZ2luYWw=');
        expect(encode).toHaveBeenCalledOnce();
        expect(await context.getDataUri('bad')).toBeUndefined();
    });
    it('取消准备时不应用结果，空导出不访问资源仓库', async () => {
        const controller = new AbortController();
        const read = vi.fn(async () => {
            controller.abort();
            return undefined;
        });
        await expect(
            prepareExportResources([image], {
                readResource: read,
                signal: controller.signal,
            }),
        ).rejects.toMatchObject({ name: 'AbortError' });
        read.mockClear();
        await prepareExportResources([], { readResource: read });
        expect(read).not.toHaveBeenCalled();
    });
});
