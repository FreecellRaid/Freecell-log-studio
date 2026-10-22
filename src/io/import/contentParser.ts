import { Parser } from 'htmlparser2';
import { decodeHTML, decodeHTMLAttribute } from 'entities';
import type {
    ContentParseOptions,
    ImportResource,
    ParsedContent,
} from '@/types/import';

// 先按原始逗号拆分 CQ 属性，再统一解码一次，避免转义字符变成分隔符。
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
        // QQ 图片表情会在 CQ 图片前附加 faceType 元信息
        text = text.replace(
            /<faceType=\d+(?:,[^<>\r\n]*)?>(?=\[CQ:image(?:,[^\]\r\n]*)?\])/g,
            '',
        );
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
                // 其他 CQ 码暂时删除，后续可在此增加转为文字或资源的解析分支。
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
        const blocks = new Set(['p', 'div']);
        const flush = () => {
            output.push(
                options.syntax === 'mixed'
                    ? cq(text, decodeHTML)
                    : decodeHTML(text),
            );
            text = '';
        };
        // htmlparser2 不加载资源或执行脚本。文本回调可能被拆分，
        // 因此先拼接文字，再识别 CQ 码，最后只解码一次实体。
        const parser = new Parser(
            {
                onopentag(name, attributes) {
                    if (
                        ['script', 'style', 'head', 'template'].includes(name)
                    ) {
                        hidden++;
                        return;
                    }
                    if (hidden) return;
                    // 图片和换行在此解析；其他标签暂时去除，只保留文本回调中的文字。
                    // 后续可在这里扩展链接、表情等类型的解析。
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
                onclosetag(name) {
                    if (
                        ['script', 'style', 'head', 'template'].includes(name)
                    ) {
                        hidden = Math.max(0, hidden - 1);
                        return;
                    }
                    if (hidden) return;
                    if (blocks.has(name)) text += '\n';
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
