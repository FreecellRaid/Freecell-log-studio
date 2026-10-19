// 只移除首尾各一个括号，保留正文中的括号，也兼容未闭合的场外发言。
export function stripOocParentheses(content: string): string {
    return content
        .trim()
        .replace(/^[（(]/, '')
        .replace(/[）)]$/, '')
        .trim();
}
