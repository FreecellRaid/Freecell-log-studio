//针对 Content 字段清洗，暂时删除处理，预留未来解析空间
export function cleanContent(rawContent: string): string {
    if (!rawContent) return '';

    return (
        rawContent
            // 删除CQ 码
            .replace(/\[CQ:[^\]]+\]/g, '')

            // 删除 HTML 标签
            .replace('<!--', '')
            .replace('-->', '')
            // .replace(/<[^>]+>/g, '')
            // 在找到更好的办法之前，暂时先不过滤了，以免误伤骰娘的回复

            // 删除行首的 #
            .replace(/^#/gm, '')

            // 将 3 个以上的连续换行压缩为 2 个换行
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}
