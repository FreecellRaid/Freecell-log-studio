import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRemoteLog } from '@/io/import/remoteReader';

const log = 'Alice(10001) 2026-10-09 20:00:00\nhello\n';
afterEach(() => vi.useRealTimers());

describe('remote sources', () => {
    it('loads Oliva metadata then a redirected text file with encoded identifiers', async () => {
        const fetcher = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    code: 0,
                    fileName: '团名',
                    redirectDownloadUrl: 'https://files.example/log.txt',
                }),
            )
            .mockResolvedValueOnce(new Response(log));
        const result = await readRemoteLog(
            { source: 'oliva', id: 'log_团名 &+' },
            { fetch: fetcher },
        );
        const url = new URL(String(fetcher.mock.calls[0][0]));
        expect(url.searchParams.get('id')).toBe('log_团名 &+');
        expect(url.searchParams.get('m')).toBe('metaData');
        expect(fetcher.mock.calls[1][0]).toBe('https://files.example/log.txt');
        expect(result).toMatchObject({
            name: '团名',
            text: log,
            format: 'standard-adapter',
            source: { provider: 'oliva', id: 'log_团名 &+' },
        });
        expect(fetcher.mock.calls[1][1]).toMatchObject({
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
        });
    });

    it('uses rawData when metadata does not provide a redirect', async () => {
        const fetcher = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(Response.json({ code: 0 }))
            .mockResolvedValueOnce(new Response(log));
        await readRemoteLog(
            { source: 'oliva', id: 'log_a_temp' },
            { fetch: fetcher },
        );
        expect(
            new URL(String(fetcher.mock.calls[1][0])).searchParams.get('m'),
        ).toBe('rawData');
    });

    it('reports expired logs without attempting to download content', async () => {
        const fetcher = vi
            .fn<typeof fetch>()
            .mockResolvedValue(
                Response.json({ code: 1, content: '日志已过期' }),
            );
        await expect(
            readRemoteLog({ source: 'oliva', id: 'old' }, { fetch: fetcher }),
        ).rejects.toThrow('日志已过期');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('loads direct URLs and retains format hints', async () => {
        const result = await readRemoteLog(
            {
                source: 'url',
                url: 'https://logs.example/%E5%9B%A2%E5%90%8D.txt',
                format: 'standard-adapter',
            },
            {
                fetch: vi
                    .fn<typeof fetch>()
                    .mockResolvedValue(new Response(log)),
            },
        );
        expect(result).toMatchObject({
            name: '团名.txt',
            text: log,
            format: 'standard-adapter',
        });
    });

    it('rejects unknown sources before making a request', async () => {
        const fetcher = vi.fn<typeof fetch>();
        await expect(
            readRemoteLog({ source: 'unknown' }, { fetch: fetcher }),
        ).rejects.toThrow('不支持');
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('rejects insecure redirects, HTTP failures, empty responses and network errors', async () => {
        const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
            Response.json({
                code: 0,
                redirectDownloadUrl: 'http://files.example/log',
            }),
        );
        await expect(
            readRemoteLog({ source: 'oliva', id: 'a' }, { fetch: fetcher }),
        ).rejects.toThrow('HTTPS');
        const request = { source: 'url', url: 'https://logs.example/a' };
        await expect(
            readRemoteLog(request, {
                fetch: vi
                    .fn<typeof fetch>()
                    .mockResolvedValue(
                        new Response('missing', { status: 404 }),
                    ),
            }),
        ).rejects.toThrow('HTTP 404');
        await expect(
            readRemoteLog(request, {
                fetch: vi
                    .fn<typeof fetch>()
                    .mockResolvedValue(new Response(' ')),
            }),
        ).rejects.toThrow('空日志');
        await expect(
            readRemoteLog(request, {
                fetch: vi
                    .fn<typeof fetch>()
                    .mockRejectedValue(new TypeError('Failed to fetch')),
            }),
        ).rejects.toThrow('跨域');
    });

    it('enforces the actual stream size even without a Content-Length header', async () => {
        const request = { source: 'url', url: 'https://logs.example/a' };
        await expect(
            readRemoteLog(request, {
                maxBytes: 2,
                fetch: vi
                    .fn<typeof fetch>()
                    .mockResolvedValue(new Response('123')),
            }),
        ).rejects.toThrow('大小');
    });

    it('cancels the in-flight fetch on timeout or explicit cancellation', async () => {
        vi.useFakeTimers();
        const fetcher: typeof fetch = (_url, init) =>
            new Promise((_resolve, reject) => {
                init?.signal?.addEventListener(
                    'abort',
                    () => reject(new DOMException('aborted', 'AbortError')),
                    { once: true },
                );
            });
        const request = { source: 'url', url: 'https://logs.example/a' };
        const pending = readRemoteLog(request, {
            fetch: fetcher,
            timeoutMs: 10,
        });
        const assertion = expect(pending).rejects.toThrow('超时');
        await vi.advanceTimersByTimeAsync(10);
        await assertion;
        const controller = new AbortController();
        const cancelled = readRemoteLog(request, {
            fetch: fetcher,
            signal: controller.signal,
        });
        controller.abort();
        await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    });
});
