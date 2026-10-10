import type { LogSourceAdapter, RemoteSourceContext } from './types';
import { SEALDICE_LOG_FORMAT } from '../sealdiceLog';

async function inflateLog(
    data: string,
    context: RemoteSourceContext,
): Promise<string> {
    let binary: string;
    try {
        binary = atob(data);
    } catch {
        throw new Error('海豹日志压缩数据无效');
    }
    if (typeof DecompressionStream === 'undefined')
        throw new Error('当前浏览器不支持解压海豹日志，请更新浏览器');
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const reader = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('deflate'))
        .getReader();
    const abort = () => {
        void reader.cancel(context.signal.reason).catch(() => undefined);
    };
    context.signal.addEventListener('abort', abort, { once: true });
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let text = '';
    try {
        while (true) {
            context.signal.throwIfAborted();
            const chunk = await reader.read();
            context.signal.throwIfAborted();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > context.maxBytes)
                throw new Error('海豹日志解压后超过允许的大小');
            text += decoder.decode(chunk.value, { stream: true });
        }
        return text + decoder.decode();
    } catch (error) {
        await reader.cancel().catch(() => undefined);
        context.signal.throwIfAborted();
        if (error instanceof Error && error.message.includes('大小'))
            throw error;
        throw new Error('海豹日志解压失败，压缩数据可能已损坏');
    } finally {
        context.signal.removeEventListener('abort', abort);
        reader.releaseLock();
    }
}

export const sealdiceSource: LogSourceAdapter = {
    id: 'sealdice',
    async load(request, context) {
        if (!request.id?.trim() || !request.password?.trim())
            throw new Error('缺少海豹日志标识或密码');
        const url = new URL('https://dice-api.weizaima.com/dice/api/load_data');
        url.searchParams.set('key', request.id);
        url.searchParams.set('password', request.password);
        const value: unknown = JSON.parse(await context.readText(url.href));
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('海豹日志服务器返回了无效数据');
        const response = value as Record<string, unknown>;
        if (response.client === 'Parquet')
            throw new Error(
                '暂不支持海豹 Parquet 日志，请使用 .log export 导出的 TXT 文件',
            );
        if (response.client !== undefined && response.client !== 'SealDice')
            throw new Error('不支持的海豹日志编码');
        if (typeof response.data !== 'string' || !response.data)
            throw new Error('无法读取海豹日志，请检查日志标识和密码');
        return {
            name:
                typeof response.name === 'string' && response.name
                    ? response.name
                    : request.id,
            text: await inflateLog(response.data, context),
            format: SEALDICE_LOG_FORMAT,
            // 密码不写入工程文件；同一日志换密码后仍识别为同一来源。
            source: { provider: 'sealdice', id: request.id },
        };
    },
};
