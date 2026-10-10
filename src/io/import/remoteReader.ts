import { getLogSource } from './sources/registry';
import type { RemoteLogRequest } from './sources/types';
import { validateRemoteUrl } from './remoteLink';
import { decodeText } from './textDecoder';

export interface RemoteReadOptions {
    signal?: AbortSignal;
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxBytes?: number;
}

export async function readRemoteLog(
    request: RemoteLogRequest,
    options: RemoteReadOptions = {},
) {
    const source = getLogSource(request.source);
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener('abort', abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, options.timeoutMs ?? 30000);
    const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
    let totalBytes = 0;
    const readText = async (value: string): Promise<string> => {
        controller.signal.throwIfAborted();
        const url = validateRemoteUrl(value);
        const response = await (options.fetch ?? globalThis.fetch)(url.href, {
            signal: controller.signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        });
        if (!response.ok)
            throw new Error(`日志下载失败（HTTP ${response.status}）`);
        if (response.url) validateRemoteUrl(response.url);
        const declaredSize = Number(response.headers.get('content-length'));
        if (declaredSize > maxBytes - totalBytes) {
            await response.body?.cancel();
            throw new Error('日志超过允许的下载大小');
        }
        if (!response.body) throw new Error('日志服务器未返回内容');
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
            while (true) {
                controller.signal.throwIfAborted();
                const chunk = await reader.read();
                if (chunk.done) break;
                size += chunk.value.byteLength;
                totalBytes += chunk.value.byteLength;
                if (totalBytes > maxBytes)
                    throw new Error('日志超过允许的下载大小');
                chunks.push(chunk.value);
            }
        } catch (error) {
            await reader.cancel().catch(() => undefined);
            throw error;
        } finally {
            reader.releaseLock();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        return (await decodeText(bytes)).text;
    };
    try {
        const result = await source.load(request, {
            readText,
            signal: controller.signal,
            maxBytes,
        });
        controller.signal.throwIfAborted();
        if (!result.text.trim()) throw new Error('日志服务器返回了空日志');
        return result;
    } catch (error) {
        if (timedOut) throw new Error('日志下载超时，请重试');
        if (options.signal?.aborted) throw error;
        if (error instanceof TypeError)
            throw new Error('无法读取日志，请检查网络和日志服务器的跨域设置');
        throw error;
    } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
    }
}
