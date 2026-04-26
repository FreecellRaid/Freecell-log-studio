import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ColorRule, ColorMode, ViewSettings } from '@/types/style';
import type { Message } from '@/types/log';
import { generateId } from '@/utils/id';
import { collectIdentityValues } from '@/editor/identity';

function ruleStore() {
    const viewSettings = ref<ViewSettings>({
        showTime: true,
        showAccount: true,
        hideOoc: false,
        hideCommand: false,
        enableMarkdown: false,
        colorMode: 'playerName',
    });
    const rules = ref<ColorRule[]>([]);

    // 获取所有系统基础规则 (Priority 0)
    const systemRules = computed(() => {
        return rules.value.filter((r) => {
            return r.priority === 0;
        });
    });

    // 获取自定义规则 (Priority > 0)
    const customRules = computed(() => {
        return rules.value
            .filter((r) => {
                return r.priority > 0;
            })
            .sort(function (a, b) {
                return a.priority - b.priority;
            });
    });

    const activeRules = computed(() => {
        return rules.value.filter((r) => {
            return r.isActive;
        });
    });

    function buildSystemRule(
        type: 'playerName' | 'account',
        value: string,
        color: string,
        existingRule?: ColorRule,
    ): ColorRule {
        return {
            ruleId: existingRule?.ruleId ?? generateId(),
            ruleName: `${type === 'playerName' ? '角色' : '账号'}: ${value}`,
            filter: { [type]: value },
            color: existingRule?.color ?? color,
            colorArea: 'all',
            priority: 0,
            isActive: viewSettings.value.colorMode === type,
        };
    }

    // 基于当前消息全集重建系统规则，保留自定义规则以及已有系统规则的颜色和 ruleId
    function syncSystemRulesFromMessages(messages: Message[]) {
        const customRules = rules.value.filter((r) => r.priority > 0);
        const existingNameRules = new Map<string, ColorRule>();
        const existingAccountRules = new Map<string, ColorRule>();

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            if (rule.priority !== 0) {
                continue;
            }

            if (typeof rule.filter.playerName === 'string') {
                existingNameRules.set(rule.filter.playerName, rule);
            }

            if (typeof rule.filter.account === 'string') {
                existingAccountRules.set(rule.filter.account, rule);
            }
        }

        const nextSystemRules: ColorRule[] = [];
        const playerNames = collectIdentityValues(messages, 'playerName');
        const accounts = collectIdentityValues(messages, 'account');
        let colorIndex = 0;

        for (let i = 0; i < playerNames.length; i++) {
            const value = playerNames[i];
            const existingRule = existingNameRules.get(value);
            const color = PRESET_COLORS[colorIndex % PRESET_COLORS.length];
            nextSystemRules.push(
                buildSystemRule('playerName', value, color, existingRule),
            );
            if (!existingRule) {
                colorIndex++;
            }
        }

        for (let i = 0; i < accounts.length; i++) {
            const value = accounts[i];
            const existingRule = existingAccountRules.get(value);
            const color = PRESET_COLORS[colorIndex % PRESET_COLORS.length];
            nextSystemRules.push(
                buildSystemRule('account', value, color, existingRule),
            );
            if (!existingRule) {
                colorIndex++;
            }
        }

        rules.value = [...nextSystemRules, ...customRules];
    }

    function setColorMode(mode: ColorMode) {
        viewSettings.value.colorMode = mode;

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            if (rule.priority === 0) {
                rule.isActive =
                    mode === 'playerName'
                        ? !!rule.filter.playerName
                        : !!rule.filter.account;
            }
        }
    }

    //同步修改：当玩家修改了名字/账号时，同步更新对应的规则过滤器
    function updateSystemRuleTarget(
        type: 'playerName' | 'account',
        oldValue: string,
        newValue: string,
    ): boolean {
        const targetRuleIndex = rules.value.findIndex(function (r) {
            return r.priority === 0 && r.filter[type] === newValue;
        });
        const sourceRuleIndex = rules.value.findIndex(function (r) {
            return r.priority === 0 && r.filter[type] === oldValue;
        });

        if (sourceRuleIndex === -1) return false;

        if (targetRuleIndex !== -1) {
            // 如果目标已存在，删除当前的规则，因为它们现在共享同一个目标名
            rules.value.splice(sourceRuleIndex, 1);
            return true;
        } else {
            const rule = rules.value[sourceRuleIndex];
            rule.filter[type] = newValue;
            rule.ruleName = `${type === 'playerName' ? '角色' : '账号'}: ${newValue}`;
            return false;
        }
    }

    // Action: CRUD
    function addCustomRule(name: string, color: string = '#1976D2') {
        let maxPriority = 0;
        for (const rule of rules.value) {
            if (rule.priority > maxPriority) {
                maxPriority = rule.priority;
            }
        }
        // 默认为最高优先级 + 1
        const newPriority = maxPriority > 0 ? maxPriority + 1 : 1;

        const newRule: ColorRule = {
            ruleId: generateId(),
            ruleName: name,
            filter: {},
            color: color,
            colorArea: 'all',
            priority: newPriority,
            isActive: false,
        };
        rules.value.push(newRule);
    }

    function updateRule(ruleId: string, updates: Partial<ColorRule>) {
        const rule = rules.value.find(function (r) {
            return r.ruleId === ruleId;
        });
        if (rule) {
            Object.assign(rule, updates);
        }
    }

    function deleteRule(ruleId: string) {
        const index = rules.value.findIndex(function (r) {
            return r.ruleId === ruleId;
        });
        if (index !== -1) {
            rules.value.splice(index, 1);
        }
    }

    function clearRules() {
        rules.value = [];
    }

    function replaceRules(newRules: ColorRule[]) {
        rules.value = newRules;
    }

    function replaceViewSettings(newSettings: ViewSettings) {
        viewSettings.value = {
            showTime: newSettings.showTime,
            showAccount: newSettings.showAccount,
            hideOoc: newSettings.hideOoc,
            hideCommand: newSettings.hideCommand,
            enableMarkdown: newSettings.enableMarkdown,
            colorMode: newSettings.colorMode,
        };
    }

    return {
        viewSettings,
        rules,
        systemRules,
        customRules,
        activeRules,
        syncSystemRulesFromMessages,
        setColorMode,
        updateSystemRuleTarget,
        addCustomRule,
        updateRule,
        deleteRule,
        clearRules,
        replaceRules,
        replaceViewSettings,
    };
}

const PRESET_COLORS = [
    '#FF5733',
    '#D32F2F',
    '#FF8F00',
    '#FBC02D',
    '#C2185B',
    '#7B1FA2',
    '#1976D2',
    '#00695C',
    '#00796B',
    '#388E3C',
    '#689F38',
    '#8E24AA',
    '#424242',
    '#616161',
    '#546E7A',
    '#795548',
    '#0097A7',
    '#E91E63',
    '#FF4081',
    '#00B0FF',
    '#7C4DFF',
];
export const useStyleStore = defineStore('rule', ruleStore);
