import type { MessageFilter } from './log';

// 样式范围：all(名字和内容) | playerName(仅名字) | content(仅内容)
export type StyleArea = 'all' | 'playerName' | 'content';
// 初始化逻辑：基于角色名/账号
export type ColorMode = 'playerName' | 'account';

export interface RuleStyle {
    color?: string;
    bold?: true;
    italic?: true;
}

export interface StyleRule {
    ruleId: string;
    ruleName: string;
    filter: MessageFilter;
    style: RuleStyle;
    area: StyleArea;
    priority: number; //规则的优先级(大覆盖小)
    isActive: boolean; //是否启用该规则
}

export interface ViewSettings {
    hideOoc: boolean;
    hideCommand: boolean;
    enableMarkdown: boolean;
    colorMode: ColorMode; //决定采用哪种初始染色规则
}
