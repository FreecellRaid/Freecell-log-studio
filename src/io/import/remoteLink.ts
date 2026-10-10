import type { RemoteLogRequest } from './sources/types';

export function validateRemoteUrl(value: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error('日志地址不是有效的 URL');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('日志下载地址必须是无内嵌账号密码的 HTTPS 地址');
    return url;
}

export function parseRemoteLogLink(input: string): RemoteLogRequest | null {
    const value = input.trim();
    if (!value.startsWith('#')) {
        const url = new URL(value);
        // 海豹旧染色器链接只用于提取标识，下载始终使用固定 HTTPS API。
        if (
            ['http:', 'https:'].includes(url.protocol) &&
            url.hostname === 'log.weizaima.com' &&
            !url.username &&
            !url.password &&
            !url.port &&
            url.pathname === '/' &&
            url.searchParams.has('key')
        ) {
            if (url.searchParams.getAll('key').length !== 1)
                throw new Error('链接中 key 参数重复');
            const id = url.searchParams.get('key') || '';
            const password = decodeURIComponent(url.hash.slice(1));
            if (!id.trim() || !password.trim())
                throw new Error('缺少海豹日志标识或密码');
            return { source: 'sealdice', id, password };
        }
    }
    const hash = value.startsWith('#')
        ? value.slice(1)
        : new URL(value).hash.slice(1);
    // 仅保留青果的旧编号；新来源使用具名参数。
    if (hash.startsWith('2-')) {
        const id = decodeURIComponent(hash.slice(2));
        if (!id.trim()) throw new Error('缺少青果日志标识');
        return { source: 'oliva', id };
    }
    const params = new URLSearchParams(hash);
    if (!params.has('source')) return null;
    for (const key of ['source', 'id', 'url', 'format', 'password']) {
        if (params.getAll(key).length > 1)
            throw new Error(`链接中 ${key} 参数重复`);
    }
    const source = params.get('source') || '';
    if (!source) throw new Error('缺少日志来源');
    const request: RemoteLogRequest = { source };
    for (const key of ['id', 'url', 'format', 'password'] as const) {
        const field = params.get(key);
        if (field) request[key] = field;
    }
    return request;
}

export function resolveRemoteInput(input: string): RemoteLogRequest {
    const request = parseRemoteLogLink(input);
    if (request) return request;
    const url = validateRemoteUrl(input);
    if (url.hash)
        throw new Error(
            '无法识别此日志链接，请使用机器人生成的编辑器链接或 HTTPS 日志直链',
        );
    return { source: 'url', url: url.href };
}

export function buildRemoteLogLink(
    editorUrl: string,
    request: RemoteLogRequest,
): string {
    const url = new URL(editorUrl);
    const params = new URLSearchParams({ source: request.source });
    for (const key of ['id', 'url', 'format', 'password'] as const) {
        if (request[key]) params.set(key, request[key]);
    }
    url.hash = params.toString();
    return url.href;
}
