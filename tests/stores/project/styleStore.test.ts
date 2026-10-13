import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStyleStore } from '@/stores/project/styleStore';
import { computeStyleForMessage } from '@/editor/styleEngine';
import { flattenLogToRows } from '@/io/export/flattener';
import { cloneRules } from '@/io/storage/project';
import type { LogDocument, Message } from '@/types/log';

describe('style store default rules', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('creates default rules when system rules are first synchronized', () => {
        const store = useStyleStore();

        expect(store.rules).toHaveLength(0);

        store.syncSystemRulesFromMessages([]);

        expect(store.rules).toHaveLength(2);
        expect(store.rules[0]).toMatchObject({
            ruleName: '角色名加粗',
            filter: {},
            style: { bold: true },
            area: 'playerName',
            priority: 1,
            isActive: false,
        });
        expect(store.rules[1]).toMatchObject({
            ruleName: '场外消息斜体',
            filter: { isOoc: true },
            style: { italic: true },
            area: 'content',
            priority: 1,
            isActive: false,
        });
    });

    it('does not recreate defaults during later synchronizations', () => {
        const store = useStyleStore();
        store.syncSystemRulesFromMessages([]);
        const firstRuleIds = store.rules.map((rule) => rule.ruleId);

        store.syncSystemRulesFromMessages([]);

        expect(store.rules.map((rule) => rule.ruleId)).toEqual(firstRuleIds);
    });

    it('does not add defaults when loading an existing project', () => {
        const store = useStyleStore();
        store.replaceRules([]);

        store.syncSystemRulesFromMessages([]);

        expect(store.rules).toHaveLength(0);
    });
});

describe('style store color mode synchronization', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    const message: Message = {
        messageId: 'message-1',
        chunkId: 'chunk-1',
        messageIndex: 0,
        playerName: '调查员',
        account: 'account-1',
        time: new Date('2026-10-13T12:00:00Z'),
        content: '推开房门。',
        isOoc: false,
        isCommand: false,
        role: 'pl',
        note: '',
    };

    it('updates message and export colors immediately on direct mode changes without a sidebar', () => {
        const store = useStyleStore();
        store.syncSystemRulesFromMessages([message]);
        const nameRule = store.systemRules.find(
            (rule) => rule.filter.playerName === message.playerName,
        )!;
        const accountRule = store.systemRules.find(
            (rule) => rule.filter.account === message.account,
        )!;
        const originalRules = store.rules.map((rule) => ({
            ruleId: rule.ruleId,
            style: { ...rule.style },
        }));
        const documents: LogDocument[] = [
            {
                docId: 'doc-1',
                docName: '日志',
                docIndex: 0,
                chunks: [
                    {
                        chunkId: message.chunkId,
                        docId: 'doc-1',
                        chunkName: '场景',
                        chunkIndex: 0,
                        messages: [message],
                    },
                ],
            },
        ];

        for (const mode of ['account', 'playerName'] as const) {
            // 与桌面和移动端设置控件的 v-model 写入方式相同。
            store.viewSettings.colorMode = mode;
            const expectedColor =
                mode === 'account'
                    ? accountRule.style.color
                    : nameRule.style.color;

            expect(nameRule.isActive).toBe(mode === 'playerName');
            expect(accountRule.isActive).toBe(mode === 'account');
            expect(
                computeStyleForMessage(message, store.activeRules).nameStyle
                    .color,
            ).toBe(expectedColor);
            expect(
                flattenLogToRows(
                    documents,
                    store.viewSettings,
                    store.activeRules,
                ).find((row) => row.type === 'message')?.nameStyle?.color,
            ).toBe(expectedColor);
        }
        expect(
            store.rules.map((rule) => ({
                ruleId: rule.ruleId,
                style: { ...rule.style },
            })),
        ).toEqual(originalRules);
        expect(store.customRules.every((rule) => !rule.isActive)).toBe(true);
    });

    it('keeps restored rules consistent with the current mode and preserves custom activation', () => {
        const store = useStyleStore();
        store.syncSystemRulesFromMessages([message]);
        const restoredRules = cloneRules(store.rules);
        const customRule = restoredRules.find((rule) => rule.priority > 0)!;
        customRule.isActive = true;
        store.setColorMode('account');

        // 历史恢复会替换规则，但不会恢复视图设置中的染色模式。
        store.replaceRules(restoredRules);

        expect(store.activeRules.filter((rule) => rule.priority === 0)).toEqual(
            [expect.objectContaining({ filter: { account: message.account } })],
        );
        expect(
            store.rules.find((rule) => rule.ruleId === customRule.ruleId)
                ?.isActive,
        ).toBe(true);
    });

    it('synchronizes activation when loading project view settings', () => {
        const store = useStyleStore();
        store.syncSystemRulesFromMessages([message]);
        store.replaceViewSettings({
            ...store.viewSettings,
            colorMode: 'account',
        });

        expect(store.activeRules.filter((rule) => rule.priority === 0)).toEqual(
            [expect.objectContaining({ filter: { account: message.account } })],
        );
    });
});
