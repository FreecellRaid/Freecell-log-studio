<template>
    <section class="panel">
        <div class="panel-header" @click="expanded = !expanded">
            <button
                type="button"
                class="section-toggle"
                :aria-expanded="expanded"
                aria-controls="coloring-rules"
                @click.stop="expanded = !expanded"
            >
                <span class="expand-icon" :class="{ 'is-expanded': expanded }">
                    <ChevronRight class="ui-icon" />
                </span>
                <span>自定义样式规则</span>
                <span class="section-count">
                    {{ styleStore.customRules.length }}
                </span>
            </button>
            <button
                class="icon-button icon-interactive"
                @click.stop="handleCreateRule"
                title="创建规则"
            >
                <Plus class="ui-icon" />
            </button>
        </div>

        <div v-show="expanded" id="coloring-rules" class="panel-block-list">
            <div
                v-if="styleStore.customRules.length === 0"
                class="panel-empty-hint"
            >
                暂无自定义规则，点击+创建
            </div>

            <div
                v-for="rule in styleStore.customRules"
                :key="rule.ruleId"
                class="rule-block"
            >
                <div class="rule-header" @click="toggleExpand(rule.ruleId)">
                    <div
                        class="expand-icon"
                        :class="{
                            'is-expanded': expandedRules.has(rule.ruleId),
                        }"
                    >
                        <ChevronRight class="ui-icon" />
                    </div>
                    <div class="rule-name">
                        <span>{{ rule.ruleName || '未命名规则' }}</span>
                    </div>
                    <button
                        class="icon-button icon-button-warning"
                        type="button"
                        title="删除规则"
                        @click.stop="handleDeleteRule(rule)"
                    >
                        <Trash2 class="ui-icon" />
                    </button>
                    <button
                        class="toggle-button"
                        type="button"
                        :title="rule.isActive ? '禁用规则' : '启用规则'"
                        @click.stop="toggleRuleActive(rule)"
                    >
                        <Eye
                            v-if="rule.isActive"
                            class="ui-icon toggle-button__icon is-active"
                            aria-hidden="true"
                        />
                        <EyeOff
                            v-else
                            class="ui-icon toggle-button__icon"
                            aria-hidden="true"
                        />
                    </button>
                    <div
                        v-if="rule.style.color"
                        class="color-picker-wrapper"
                        :style="{ backgroundColor: rule.style.color }"
                    >
                        <input
                            type="color"
                            :value="rule.style.color"
                            @input="updateColor(rule, $event)"
                            @click.stop
                        />
                    </div>
                </div>

                <div v-show="expandedRules.has(rule.ruleId)" class="rule-body">
                    <div class="rule-impact">
                        当前规则影响 {{ getAffectedMessageCount(rule) }} 条消息
                    </div>

                    <div class="form-group">
                        <input
                            class="form-control"
                            type="text"
                            :value="
                                getRuleDraftValue(
                                    rule.ruleId,
                                    'ruleName',
                                    rule.ruleName,
                                )
                            "
                            @input="
                                updateRuleDraft(rule.ruleId, 'ruleName', $event)
                            "
                            v-click-outside="() => commitRuleName(rule)"
                            @keydown.enter.exact.prevent="commitRuleName(rule)"
                            placeholder="输入规则名称"
                        />
                    </div>

                    <div class="form-group">
                        <div class="style-effect-controls">
                            <ToggleButton
                                :model-value="rule.style.color !== undefined"
                                @update:model-value="
                                    setStyleEffect(
                                        rule,
                                        'color',
                                        Boolean($event),
                                    )
                                "
                            >
                                颜色
                            </ToggleButton>
                            <ToggleButton
                                :model-value="rule.style.bold === true"
                                @update:model-value="
                                    setStyleEffect(
                                        rule,
                                        'bold',
                                        Boolean($event),
                                    )
                                "
                            >
                                加粗
                            </ToggleButton>
                            <ToggleButton
                                :model-value="rule.style.italic === true"
                                @update:model-value="
                                    setStyleEffect(
                                        rule,
                                        'italic',
                                        Boolean($event),
                                    )
                                "
                            >
                                斜体
                            </ToggleButton>
                        </div>
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>优先级</label>
                            <NumberInput
                                :model-value="rule.priority"
                                :min="1"
                                aria-label="规则优先级"
                                @update:model-value="
                                    handleUpdate(rule.ruleId, {
                                        priority: $event,
                                    })
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>作用范围</label>
                            <PopoverSelect
                                class="form-control"
                                :model-value="rule.area"
                                @update:model-value="
                                    handleUpdate(rule.ruleId, {
                                        area: $event,
                                    })
                                "
                                aria-label="作用范围"
                                :options="
                                    [
                                        { value: 'all', label: '全部' },
                                        {
                                            value: 'playerName',
                                            label: '仅名字',
                                        },
                                        { value: 'content', label: '仅内容' },
                                    ] as const
                                "
                            />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>角色名</label>
                        <MultiTagSelect
                            :model-value="
                                getIdentityFilterValues(rule.filter.playerName)
                            "
                            :options="playerNameOptions"
                            @update:model-value="
                                updateIdentityFilter(rule, 'playerName', $event)
                            "
                        />
                    </div>
                    <div class="form-group">
                        <label>账号</label>
                        <MultiTagSelect
                            :model-value="
                                getIdentityFilterValues(rule.filter.account)
                            "
                            :options="accountOptions"
                            @update:model-value="
                                updateIdentityFilter(rule, 'account', $event)
                            "
                        />
                    </div>
                    <div class="form-group">
                        <label>内容</label>
                        <input
                            class="form-control filter-text-input"
                            :value="
                                getRuleDraftValue(
                                    rule.ruleId,
                                    'filter.content',
                                    formatArray(rule.filter.content),
                                )
                            "
                            @input="
                                updateRuleDraft(
                                    rule.ruleId,
                                    'filter.content',
                                    $event,
                                )
                            "
                            v-click-outside="
                                () => commitFilterDraft(rule, 'content')
                            "
                            @keydown.enter.exact.prevent="
                                commitFilterDraft(rule, 'content')
                            "
                            placeholder="如: 于此同时，另一边……"
                        />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <input
                            class="form-control filter-text-input"
                            :value="
                                getRuleDraftValue(
                                    rule.ruleId,
                                    'filter.note',
                                    formatArray(rule.filter.note),
                                )
                            "
                            @input="
                                updateRuleDraft(
                                    rule.ruleId,
                                    'filter.note',
                                    $event,
                                )
                            "
                            v-click-outside="
                                () => commitFilterDraft(rule, 'note')
                            "
                            @keydown.enter.exact.prevent="
                                commitFilterDraft(rule, 'note')
                            "
                            placeholder="如: 战斗轮消息……"
                        />
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>身份</label>
                            <PopoverSelect
                                class="form-control"
                                :model-value="
                                    Array.isArray(rule.filter.role)
                                        ? ''
                                        : rule.filter.role || ''
                                "
                                @update:model-value="
                                    updateFilterValue(rule, 'role', $event)
                                "
                                aria-label="身份"
                                :options="
                                    [
                                        { value: '', label: '任意' },
                                        { value: 'pl', label: '玩家' },
                                        { value: 'gm', label: '主持人' },
                                        { value: 'npc', label: 'NPC' },
                                        { value: 'bot', label: '骰子' },
                                        { value: 'ob', label: '观众' },
                                    ] as const
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>是否场外</label>
                            <PopoverSelect
                                class="form-control"
                                :model-value="
                                    rule.filter.isOoc?.toString() || ''
                                "
                                @update:model-value="
                                    updateFilterValue(
                                        rule,
                                        'isOoc',
                                        $event,
                                        true,
                                    )
                                "
                                aria-label="是否场外"
                                :options="
                                    [
                                        { value: '', label: '任意' },
                                        { value: 'true', label: '是' },
                                        { value: 'false', label: '否' },
                                    ] as const
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>是否指令</label>
                            <PopoverSelect
                                class="form-control"
                                :model-value="
                                    rule.filter.isCommand?.toString() || ''
                                "
                                @update:model-value="
                                    updateFilterValue(
                                        rule,
                                        'isCommand',
                                        $event,
                                        true,
                                    )
                                "
                                aria-label="是否指令"
                                :options="
                                    [
                                        { value: '', label: '任意' },
                                        { value: 'true', label: '是' },
                                        { value: 'false', label: '否' },
                                    ] as const
                                "
                            />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            选区快捷绑定
                            <span
                                v-if="activeContext.hasSelection"
                                class="inline-hint"
                            >
                                已选
                                {{ activeContext.selectedMessagesCount }} 条
                            </span>
                        </label>
                        <div class="form-row two-col">
                            <button
                                class="text-button action-btn"
                                type="button"
                                @click="bindSelectedIds(rule)"
                            >
                                绑定选中
                            </button>
                            <button
                                class="text-button action-btn"
                                type="button"
                                @click="clearIds(rule)"
                            >
                                取消绑定
                            </button>
                        </div>

                        <div
                            v-if="rule.filter.messageId"
                            class="binding-status"
                        >
                            当前已绑定
                            {{ getBindingCount(rule.filter.messageId) }} 条消息
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import NumberInput from '@/components/common/NumberInput.vue';
import PopoverSelect from '@/components/common/PopoverSelect.vue';
import MultiTagSelect, {
    type SelectOption,
} from '@/components/common/MultiTagSelect.vue';
import { buildIdentityStats } from '@/editor/identity';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';

import type { SelectionScope } from '@/types/selection';
import { ChevronRight, Eye, EyeOff, Plus, Trash2 } from '@lucide/vue';
import { ref, computed } from 'vue';
import { useStyleStore } from '@/stores/project/styleStore';
import { useLogStore } from '@/stores/project/logStore';
import { useSelectionContext } from '@/composables/application/useSelectionContext';
import { useDraftValues } from '@/composables/application/useDraftValues';
import type { ColorMode, StyleRule } from '@/types/style';
import type { MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { vClickOutside } from '@/directives/clickOutside';
import ToggleButton from '@/components/common/ToggleButton.vue';

const expanded = defineModel<boolean>('expanded', { default: true });

const styleStore = useStyleStore();
const logStore = useLogStore();
const editorWorkspace = useWorkspaceStore();
const activeViewScope = computed<SelectionScope>(() => {
    const view = editorWorkspace.activePane;
    return view.view.kind === 'scene'
        ? { kind: 'scene', chunkId: view.view.chunkId }
        : { kind: 'none' };
});
const activeContext = useSelectionContext(activeViewScope);
const expandedRules = ref<Set<string>>(new Set());

type RuleDraftField = 'ruleName' | 'filter.content' | 'filter.note';
const ruleDrafts = useDraftValues<RuleDraftField>();

function toggleExpand(ruleId: string) {
    if (expandedRules.value.has(ruleId)) {
        expandedRules.value.delete(ruleId);
    } else {
        expandedRules.value.add(ruleId);
    }
}

// 基础操作
function handleCreateRule() {
    expanded.value = true;
    styleStore.addCustomRule('新规则');
    // 自动展开新建的规则（获取最后一个）
    setTimeout(() => {
        const rules = styleStore.customRules;
        if (rules.length > 0) {
            expandedRules.value.add(rules[rules.length - 1].ruleId);
        }
    }, 0);
}

function handleDeleteRule(rule: StyleRule) {
    const confirmed = window.confirm(
        `确定要删除规则“${rule.ruleName || '未命名规则'}”吗？本操作不可撤销`,
    );
    if (!confirmed) return;

    styleStore.deleteRule(rule.ruleId);
    expandedRules.value.delete(rule.ruleId);
}

function handleUpdate(ruleId: string, updates: Partial<StyleRule>) {
    styleStore.updateRule(ruleId, updates);
}

function getRuleDraftValue(
    ruleId: string,
    field: RuleDraftField,
    fallback: string,
) {
    return ruleDrafts.getValue(ruleId, field, fallback);
}

function updateRuleDraft(ruleId: string, field: RuleDraftField, event: Event) {
    ruleDrafts.update(ruleId, field, event);
}

function commitRuleName(rule: StyleRule) {
    ruleDrafts.commit(rule.ruleId, 'ruleName', (value) => {
        handleUpdate(rule.ruleId, { ruleName: value });
    });
}

// 更新顶层属性
function updateColor(rule: StyleRule, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    handleUpdate(rule.ruleId, { style: { ...rule.style, color } });
}

function setStyleEffect(
    rule: StyleRule,
    effect: 'color' | 'bold' | 'italic',
    enabled: boolean,
) {
    const style = { ...rule.style };
    if (effect === 'color') {
        if (enabled) style.color ??= '#1976D2';
        else delete style.color;
    } else if (enabled) {
        style[effect] = true;
    } else {
        delete style[effect];
    }
    handleUpdate(rule.ruleId, { style });
}

function toggleRuleActive(rule: StyleRule) {
    handleUpdate(rule.ruleId, { isActive: !rule.isActive });
}

// ---- Filter 编辑逻辑 ----
const playerNameOptions = computed(() => buildIdentityOptions('playerName'));
const accountOptions = computed(() => buildIdentityOptions('account'));

function buildIdentityOptions(mode: ColorMode): SelectOption[] {
    const stats = buildIdentityStats(logStore.allMessages, mode);
    return Array.from(stats.entries()).map(([label, data]) => ({
        label,
        count: data.count,
    }));
}

function getIdentityFilterValues(value: MessageFilter['playerName']): string[] {
    if (value === undefined || value === '') return [];
    return Array.isArray(value) ? value : [String(value)];
}

function updateIdentityFilter(
    rule: StyleRule,
    key: 'playerName' | 'account',
    values: string[],
) {
    const filter = { ...rule.filter };
    // 空数组不会匹配任何消息；清空选择时删除该字段，表示不限制此条件。
    if (values.length === 0) delete filter[key];
    else filter[key] = values.length === 1 ? values[0] : [...values];
    handleUpdate(rule.ruleId, { filter });
}

// 将数组或字符串格式化为逗号分隔的形式，方便展示在 input 中
function formatArray(val: any): string {
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
}

function commitFilterDraft(
    rule: StyleRule,
    key: Extract<keyof StyleRule['filter'], 'content' | 'note'>,
) {
    ruleDrafts.commit(rule.ruleId, `filter.${key}`, (value) => {
        updateFilterValue(rule, key, value);
    });
}

function updateFilterValue(
    rule: StyleRule,
    key: keyof StyleRule['filter'],
    value: string,
    isBoolean = false,
) {
    const val = value.trim();
    const newFilter: MessageFilter = { ...rule.filter };

    if (!val) {
        delete newFilter[key];
    } else if (isBoolean) {
        (newFilter as any)[key] = val === 'true';
    } else if (key === 'role') {
        (newFilter as any)[key] = val;
    } else {
        // 允许逗号分隔产生数组，实现 OR 逻辑（匹配 filter.ts 的设定）
        const parts = val
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean);
        (newFilter as any)[key] = parts.length > 1 ? parts : parts[0];
    }

    handleUpdate(rule.ruleId, { filter: newFilter });
}

function getAffectedMessageCount(rule: StyleRule) {
    return logStore.allMessages.filter((message) =>
        matchesMessageFilter(message, rule.filter),
    ).length;
}

function bindSelectedIds(rule: StyleRule) {
    const selectedMsgs = activeContext.selectedMessages.value;
    if (selectedMsgs.length === 0) return;

    const targetIds = selectedMsgs.map((m) => m.messageId);

    if (targetIds.length > 0) {
        const newFilter = { ...rule.filter, messageId: targetIds };
        styleStore.updateRule(rule.ruleId, { filter: newFilter });
    }
}

const getBindingCount = (val: any) => (Array.isArray(val) ? val.length : 1);

// 清除特定字段
const clearIds = (rule: StyleRule) => {
    const newFilter = { ...rule.filter };
    delete newFilter.messageId;
    styleStore.updateRule(rule.ruleId, { filter: newFilter });
};
</script>

<style scoped>
.rule-block {
    overflow: hidden;
}

.rule-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    cursor: pointer;
    user-select: none;
}

.rule-header:hover {
    background: var(--hover-bg);
}

.color-picker-wrapper {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    margin-left: 8px;
}

.style-effect-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 14px;
}

.color-picker-wrapper input[type='color'] {
    position: absolute;
    top: -10px;
    left: -10px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    opacity: 0;
}

.rule-name {
    font-size: 14px;
    margin-right: auto;
    flex: 1;
    min-width: 0;
}

.rule-name span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.toggle-button {
    background: transparent;
    border: none;
    padding: 0;
    margin: 0 0 0 8px;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.toggle-button__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--icon-color);
}

.toggle-button__icon.is-active {
    color: var(--active-accent);
}

.rule-header .icon-button {
    margin-left: 8px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
}

.rule-header:hover .icon-button,
.rule-header:focus-within .icon-button {
    opacity: 1;
    pointer-events: auto;
}

/* 展开内容区 */
.rule-body {
    display: flex;
    flex-direction: column;
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
}

.rule-impact {
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--text-secondary);
}

.form-group {
    margin-bottom: 12px;
    min-width: 0;
}

.form-row {
    display: flex;
    gap: 12px;
}

.form-row.two-col > .form-group,
.form-row.two-col > .action-btn {
    flex: 1;
    min-width: 0;
}

.inline-hint {
    margin-left: 6px;
    color: var(--text-secondary);
}

.filter-text-input {
    width: calc(100% - 4px);
    margin-right: 4px;
    box-sizing: border-box;
}

.action-btn {
    width: 100%;
    padding: 6px 8px;
    font-size: 13px;
    line-height: normal;
}

.binding-status {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
}
:deep(.number-input) {
    font-size: 15px;
}
</style>
