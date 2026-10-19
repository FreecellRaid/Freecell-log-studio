import { Parser } from 'htmlparser2';
import { decodeHTML, decodeHTMLAttribute } from 'entities';
import type {
    ContentParseOptions,
    ImportResource,
    ParsedContent,
} from '@/types/import';

// CQ escapes are decoded once, after splitting attributes on literal commas.
function decodeCq(text: string, attribute = false): string {
    return text.replace(/&#91;|&#93;|&amp;|&#44;/g, (value) => {
        if (value === '&#91;') return '[';
        if (value === '&#93;') return ']';
        if (value === '&#44;') return attribute ? ',' : value;
        return '&';
    });
}

export function parseContent(
    raw: string,
    options: ContentParseOptions,
): ParsedContent {
    const resources: ImportResource[] = [];
    function cq(
        text: string,
        decodeText: (text: string) => string = decodeCq,
    ): string {
        let cursor = 0;
        const output: string[] = [];
        for (const match of text.matchAll(
            /\[CQ:([a-zA-Z0-9_-]+)((?:,[^\]\r\n]*)?)\]/g,
        )) {
            output.push(decodeText(text.slice(cursor, match.index)));
            const attributes: Record<string, string> = Object.create(null);
            for (const item of match[2].slice(1).split(',')) {
                const equals = item.indexOf('=');
                if (equals > 0)
                    attributes[item.slice(0, equals)] = decodeCq(
                        item.slice(equals + 1),
                        true,
                    );
            }
            if (match[1] === 'image') {
                const file = attributes.file;
                resources.push({
                    type: 'image',
                    name:
                        attributes.name ||
                        attributes.summary ||
                        file?.split(/[\\/]/).pop() ||
                        '图片',
                    url:
                        attributes.url ||
                        (file && /^https?:\/\//i.test(file) ? file : undefined),
                    original: match[0],
                    source: 'cq',
                });
            } else {
                // Unsupported codes remain readable rather than silently disappearing.
                output.push(match[0]);
            }
            cursor = match.index! + match[0].length;
        }
        output.push(decodeText(text.slice(cursor)));
        return output.join('');
    }
    let content: string;
    if (options.syntax === 'plain') return { content: raw };
    if (options.syntax === 'cq') content = cq(raw);
    else {
        const output: string[] = [];
        let text = '';
        let hidden = 0;
        const known = new Set([
            'img',
            'br',
            'span',
            'div',
            'p',
            'a',
            'b',
            'i',
            'u',
            'strong',
            'em',
            'style',
            'script',
            'head',
            'template',
        ]);
        const blocks = new Set(['p', 'div']);
        const flush = () => {
            output.push(
                options.syntax === 'mixed'
                    ? cq(text, decodeHTML)
                    : decodeHTML(text),
            );
            text = '';
        };
        // htmlparser2 never loads URLs or executes scripts. Text callbacks may split
        // entities into several chunks, so assemble them before CQ recognition.
        const parser = new Parser(
            {
                onopentag(name, attributes, implied) {
                    if (
                        ['script', 'style', 'head', 'template'].includes(name)
                    ) {
                        hidden++;
                        return;
                    }
                    if (hidden) return;
                    if (options.syntax === 'mixed' && !known.has(name)) {
                        if (!implied)
                            text += raw.slice(
                                parser.startIndex,
                                parser.endIndex + 1,
                            );
                        return;
                    }
                    if (name === 'img') {
                        flush();
                        resources.push({
                            type: 'image',
                            name: decodeHTMLAttribute(
                                attributes.alt || attributes.title || '图片',
                            ),
                            url: attributes.src
                                ? decodeHTMLAttribute(attributes.src)
                                : undefined,
                            original: raw.slice(
                                parser.startIndex,
                                parser.endIndex + 1,
                            ),
                            source: 'html',
                        });
                    } else if (name === 'br' || blocks.has(name)) text += '\n';
                },
                ontext(value) {
                    if (!hidden) text += value;
                },
                onclosetag(name, implied) {
                    if (
                        ['script', 'style', 'head', 'template'].includes(name)
                    ) {
                        hidden = Math.max(0, hidden - 1);
                        return;
                    }
                    if (hidden) return;
                    if (options.syntax === 'mixed' && !known.has(name)) {
                        if (!implied)
                            text += raw.slice(
                                parser.startIndex,
                                parser.endIndex + 1,
                            );
                    } else if (blocks.has(name)) text += '\n';
                },
            },
            { decodeEntities: false },
        );
        parser.end(raw);
        flush();
        content = output.join('');
    }
    content = content.replace(/\n{3,}/g, '\n\n').trim();
    return resources.length ? { content, resources } : { content };
}
