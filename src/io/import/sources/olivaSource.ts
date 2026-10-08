import type { LogSourceAdapter } from './types';

const API_URL = 'https://api.dice.center/dicelogger/logReader.php';

export const olivaSource: LogSourceAdapter = {
    id: 'oliva',
    async load(request, context) {
        if (!request.id?.trim()) throw new Error('缺少青果日志标识');
        const url = new URL(API_URL);
        url.searchParams.set('id', request.id);
        url.searchParams.set('m', 'metaData');
        const metadata: unknown = JSON.parse(await context.readText(url.href));
        if (
            !metadata ||
            typeof metadata !== 'object' ||
            Array.isArray(metadata)
        )
            throw new Error('日志服务器返回了无效的元信息');
        const meta = metadata as Record<string, unknown>;
        if (meta.code !== 0)
            throw new Error(
                typeof meta.content === 'string'
                    ? meta.content
                    : '日志不存在或已过期',
            );
        if (
            meta.redirectDownloadUrl !== undefined &&
            typeof meta.redirectDownloadUrl !== 'string'
        )
            throw new Error('日志下载地址无效');
        url.searchParams.set('m', 'rawData');
        return {
            name:
                typeof meta.fileName === 'string' && meta.fileName
                    ? meta.fileName
                    : request.id,
            text: await context.readText(meta.redirectDownloadUrl || url.href),
            format: request.format || 'standard-adapter',
            source: { provider: 'oliva', id: request.id },
        };
    },
};
