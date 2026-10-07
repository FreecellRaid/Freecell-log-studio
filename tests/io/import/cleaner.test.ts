import { describe, expect, it } from 'vitest';
import { stripOocParentheses } from '@/io/import/cleaner';

describe('OOC parentheses cleanup', () => {
    it.each([
        ['（中文场外）', '中文场外'],
        ['(英文场外)', '英文场外'],
        ['（混用括号)', '混用括号'],
        ['（第一行\n第二行）', '第一行\n第二行'],
        ['  （ 内容 ）\n', '内容'],
        ['（未闭合的场外发言', '未闭合的场外发言'],
        ['（内容（说明）和(补充)）', '内容（说明）和(补充)'],
        ['((保留内层括号))', '(保留内层括号)'],
        ['（）', ''],
        ['', ''],
    ])('cleans boundary parentheses in %j', (content, expected) => {
        expect(stripOocParentheses(content)).toBe(expected);
    });
});
