import MarkdownIt, { type Token } from 'markdown-it';

export type MarkdownToken = Token;

const markdown = new MarkdownIt({
    breaks: false,
    html: false,
    linkify: true,
    typographer: false,
});

const defaultLinkOpen =
    markdown.renderer.rules.link_open ??
    ((tokens, index, options, _environment, renderer) =>
        renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (
    tokens,
    index,
    options,
    environment,
    renderer,
) => {
    tokens[index].attrSet('target', '_blank');
    tokens[index].attrSet('rel', 'noopener noreferrer');
    return defaultLinkOpen(tokens, index, options, environment, renderer);
};

// 渲染成 html 给 ui/html 导出用
export function renderMarkdownToHtml(content: string): string {
    return markdown.render(content);
}

// 给未来 docx 导出用
export function parseMarkdown(content: string): readonly MarkdownToken[] {
    return markdown.parse(content, {});
}
