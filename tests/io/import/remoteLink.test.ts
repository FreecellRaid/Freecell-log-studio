import { describe, expect, it } from 'vitest';
import {
    buildRemoteLogLink,
    parseRemoteLogLink,
    resolveRemoteInput,
    validateRemoteUrl,
} from '@/io/import/remoteLink';

describe('remote log links', () => {
    it('round trips Chinese names, plus signs, ampersands and percent escapes exactly once', () => {
        const request = {
            source: 'oliva',
            id: 'log_uuid_团名 + & %20#',
            format: 'standard-adapter',
        };
        const link = buildRemoteLogLink(
            'https://editor.example/studio/',
            request,
        );
        expect(parseRemoteLogLink(link)).toEqual(request);
        expect(
            parseRemoteLogLink('#2-log_uuid_%E5%9B%A2%E5%90%8D%20%2520'),
        ).toEqual({ source: 'oliva', id: 'log_uuid_团名 %20' });
    });

    it('preserves signed direct URLs inside editor links', () => {
        const request = {
            source: 'url',
            url: 'https://logs.example/log.txt?token=a%2Bb&expires=1',
        };
        expect(
            resolveRemoteInput(
                buildRemoteLogLink('https://editor.example', request),
            ),
        ).toEqual(request);
        expect(resolveRemoteInput(request.url)).toEqual(request);
    });

    it('ignores unrelated page fragments and rejects duplicate or empty parameters', () => {
        expect(parseRemoteLogLink('https://editor.example/#help')).toBeNull();
        expect(() => parseRemoteLogLink('#source=oliva&source=url')).toThrow(
            '重复',
        );
        expect(() => parseRemoteLogLink('#source=')).toThrow('缺少');
        expect(() => parseRemoteLogLink('#2-')).toThrow('缺少');
    });

    it.each([
        'http://logs.example/log',
        'file:///tmp/log',
        'javascript:alert(1)',
        'https://user:pass@logs.example/log',
    ])('rejects unsupported download address %s', (url) => {
        expect(() => validateRemoteUrl(url)).toThrow();
    });
});
