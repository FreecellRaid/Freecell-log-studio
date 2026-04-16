//针对 Content 字段清洗，暂时删除处理，预留未来解析空间
export function cleanContent(rawContent: string): string {
    if (!rawContent) return '';

    return (
        rawContent
            // 删除CQ 码
            .replace(/\[CQ:[^\]]+\]/g, '')

            // 删除常见 HTML tag
            .replace('<!--', '')
            .replace('-->', '')
            .replace(
                /<\/?(img|span|div|p|a|b|i|u|strong|style|script)\b[^>]*>/gi,
                '',
            )

            // 删除行首的 #
            .replace(/^#/gm, '')

            // 将 3 个以上的连续换行压缩为 2 个换行
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}
