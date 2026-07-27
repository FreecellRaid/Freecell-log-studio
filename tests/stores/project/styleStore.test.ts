import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStyleStore } from '@/stores/project/styleStore';

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
