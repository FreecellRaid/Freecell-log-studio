import type { LogSourceAdapter } from './types';
import { validateRemoteUrl } from '../remoteLink';

export const directUrlSource: LogSourceAdapter = {
    id: 'url',
    async load(request, context) {
        if (!request.url) throw new Error('缺少日志下载地址');
        const url = validateRemoteUrl(request.url);
        const name = url.pathname.split('/').pop() || '远程日志';
        return {
            name: decodeURIComponent(name),
            text: await context.readText(url.href),
            format: request.format,
            source: { provider: 'url', id: url.href },
        };
    },
};
