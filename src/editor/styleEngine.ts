import type { RuleStyle, StyleRule } from '@/types/style';
import type { Message } from '@/types/log';
import { matchesMessageFilter } from './filter';
import type { CSSProperties } from 'vue';

export interface ComputedMessageStyle {
    nameStyle: CSSProperties;
    contentStyle: CSSProperties;
}

// 类css规则计算: 优先级+层叠
export function computeStyleForMessage(
    message: Message,
    allRules: StyleRule[],
): ComputedMessageStyle {
    const result: ComputedMessageStyle = {
        nameStyle: {},
        contentStyle: {},
    };

    const matchedRules: StyleRule[] = [];
    for (let i = 0; i < allRules.length; i++) {
        const rule = allRules[i];
        if (rule.isActive && matchesMessageFilter(message, rule.filter)) {
            matchedRules.push(rule);
        }
    }

    matchedRules.sort((a, b) => {
        return a.priority - b.priority;
    });

    for (let j = 0; j < matchedRules.length; j++) {
        const rule = matchedRules[j];
        const area = rule.area;

        if (area === 'all' || area === 'playerName') {
            applyRuleStyle(result.nameStyle, rule.style);
        }

        if (area === 'all' || area === 'content') {
            applyRuleStyle(result.contentStyle, rule.style);
        }
    }

    return result;
}

function applyRuleStyle(target: CSSProperties, style: RuleStyle): void {
    if (style.color !== undefined) target.color = style.color;
    if (style.bold === true) target.fontWeight = 'bold';
    if (style.italic === true) target.fontStyle = 'italic';
}
