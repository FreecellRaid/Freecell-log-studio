import { buildLogDocument } from '@/io/import/parser';

export function imageProject() {
    const documents = [
        buildLogDocument(
            [
                { content: '正文', playerName: '甲' },
                { content: '普通消息', playerName: '乙' },
            ],
            '文档一',
            0,
        ),
        buildLogDocument(
            [{ content: '图片消息', playerName: '甲' }],
            '文档二',
            1,
        ),
    ];
    const [first, plain, last] = documents.flatMap((doc) =>
        doc.chunks.flatMap((chunk) => chunk.messages),
    );
    first!.images = [
        { imageId: 'first-shared', resourceId: 'shared', name: '共享图片' },
        { imageId: 'first-local', resourceId: 'local', name: '本地图片' },
        {
            imageId: 'first-shared-copy',
            resourceId: 'shared',
            name: '另一个名称',
        },
    ];
    last!.content = '';
    last!.images = [
        { imageId: 'last-shared', resourceId: 'shared', name: '末条共享图片' },
        { imageId: 'last-remote', resourceId: 'remote', name: '远程图片' },
    ];
    return { documents, first: first!, plain: plain!, last: last! };
}
