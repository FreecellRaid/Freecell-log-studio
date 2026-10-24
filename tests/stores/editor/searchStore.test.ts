import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSearchStore } from '@/stores/editor/searchStore';
import { useLogStore } from '@/stores/project/logStore';
import { matchesMessageFilter } from '@/editor/filter';
import type { Message } from '@/types/log';

function message(id: string, content: string, note: string): Message {
    return {
        messageId: id,
        chunkId: 'chunk',
        messageIndex: 0,
        playerName: '角色',
        account: '账号',
        time: new Date('2026-01-01'),
        content,
        note,
        isOoc: false,
        isCommand: false,
        role: 'pl',
    };
}

describe('内容和备注搜索', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        useLogStore().replaceDocuments([
            {
                docId: 'doc',
                docName: '文档',
                docIndex: 0,
                chunks: [
                    {
                        chunkId: 'chunk',
                        docId: 'doc',
                        chunkName: '片段',
                        chunkIndex: 0,
                        messages: [
                            message('a', '第12章', '待核对'),
                            message('b', '第3章', '已核对'),
                            message('c', '第\\d+章', ''),
                            message('d', ' 第12章 ', '待核对'),
                        ],
                    },
                ],
            },
        ]);
    });

    it('默认按字面搜索并保留原有去除首尾空格的行为', () => {
        const store = useSearchStore();
        store.quickSearch = ' 第\\d+章 ';
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['c']);
        store.quickSearch = '第';
        store.filter.note = ' 待核对 ';
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['a', 'd']);
    });

    it('内容与备注正则独立启用，并与其他筛选取交集', () => {
        const store = useSearchStore();
        store.quickSearch = '^第\\d+章$';
        store.contentRegex = true;
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['a', 'b']);
        store.filter.note = '^待';
        expect(store.searchResults).toEqual([]);
        store.noteRegex = true;
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['a']);
        store.filter.role = ['gm'];
        expect(store.searchResults).toEqual([]);
    });

    it('正则保留空格并支持匹配空备注', () => {
        const store = useSearchStore();
        store.contentRegex = true;
        store.quickSearch = ' ';
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['d']);
        store.quickSearch = '';
        store.noteRegex = true;
        store.filter.note = '^$';
        expect(store.searchResults.map((m) => m.messageId)).toEqual(['c']);
    });

    it.each(['content', 'note'] as const)(
        '无效的 %s 正则暂停搜索，修正或关闭模式后恢复',
        (field) => {
            const store = useSearchStore();
            store.quickSearch = '第';
            if (field === 'content') {
                store.contentRegex = true;
                store.quickSearch = '[';
            } else {
                store.noteRegex = true;
                store.filter.note = '[';
            }
            expect(store.hasActiveFilter).toBe(true);
            expect(store.hasSearchError).toBe(true);
            expect(
                field === 'content' ? store.contentError : store.noteError,
            ).not.toBe('');
            expect(store.searchResults).toEqual([]);
            if (field === 'content') store.quickSearch = '第';
            else store.filter.note = '核对$';
            expect(store.hasSearchError).toBe(false);
            expect(store.searchResults.length).toBeGreaterThan(0);
            if (field === 'content') {
                store.quickSearch = '[';
                store.contentRegex = false;
            } else {
                store.filter.note = '[';
                store.noteRegex = false;
            }
            expect(store.hasSearchError).toBe(false);
        },
    );

    it('清空筛选同时重置模式和错误', () => {
        const store = useSearchStore();
        store.contentRegex = store.noteRegex = true;
        store.quickSearch = store.filter.note = '[';
        store.clearAllFilters();
        expect(store.contentRegex).toBe(false);
        expect(store.noteRegex).toBe(false);
        expect(store.hasSearchError).toBe(false);
        expect(store.hasActiveFilter).toBe(false);
        expect(store.searchResults).toEqual([]);
    });

    it('重复使用全局或粘连正则不会漏掉消息', () => {
        const item = message('a', '第12章', '待核对');
        for (const pattern of [/第/g, /第/y]) {
            expect(matchesMessageFilter(item, { content: pattern })).toBe(true);
            expect(matchesMessageFilter(item, { content: pattern })).toBe(true);
        }
    });
});
