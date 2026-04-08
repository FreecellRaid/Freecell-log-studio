import type { ColorRule } from '@/types/config';
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
    allRules: ColorRule[],
): ComputedMessageStyle {
    const result: ComputedMessageStyle = {
        nameStyle: {},
        contentStyle: {},
    };

    const matchedRules: ColorRule[] = [];
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
        const area = rule.colorArea;

        if (area === 'all' || area === 'playerName') {
            result.nameStyle.color = rule.color;
        }

        if (area === 'all' || area === 'content') {
            result.contentStyle.color = rule.color;
        }
    }

    return result;
}
