export function normalizeImageUrl(input: string): string {
    let url: URL;
    try {
        url = new URL(input.trim());
    } catch {
        throw new Error('请输入完整的 HTTP 或 HTTPS 图片链接。');
    }
    if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
    )
        throw new Error('图片链接须为不含用户名和密码的 HTTP(S) 地址。');
    return url.href;
}
