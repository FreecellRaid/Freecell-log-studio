<template>
    <div class="panel" @pointerdown="windowStore.setFocus('ruleEditor')">
        <div class="panel-header">
            <div class="header-title">
                <h3>自定义染色规则</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="handleCreateRule"
                title="创建规则"
            >
                <Plus class="ui-icon" />
            </button>
        </div>

        <div class="panel-block-list">
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
                        class="color-picker-wrapper"
                        :style="{ backgroundColor: rule.color }"
                    >
                        <input
                            type="color"
                            :value="rule.color"
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
                            type="text"
                            v-model="rule.ruleName"
                            @change="
                                handleUpdate(rule.ruleId, {
                                    ruleName: rule.ruleName,
                                })
                            "
                            placeholder="输入规则名称"
                        />
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>优先级</label>
                            <input
                                type="number"
                                min="1"
                                v-model.number="rule.priority"
                                @change="
                                    handleUpdate(rule.ruleId, {
                                        priority: rule.priority,
                                    })
                                "
                            />
                        </div>
                        <div class="form-group">
                            <label>染色范围</label>
                            <select
                                v-model="rule.colorArea"
                                @change="
                                    handleUpdate(rule.ruleId, {
                                        colorArea: rule.colorArea,
                                    })
                                "
                            >
                                <option value="all">全部</option>
                                <option value="name">仅名字</option>
                                <option value="content">仅内容</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>角色名</label>
                        <input
                            class="filter-text-input"
                            :value="formatArray(rule.filter.playerName)"
                            @change="updateFilter(rule, 'playerName', $event)"
                            placeholder="如: KP, 骰娘……"
                        />
                    </div>
                    <div class="form-group">
                        <label>账号</label>
                        <input
                            class="filter-text-input"
                            :value="formatArray(rule.filter.account)"
                            @change="updateFilter(rule, 'account', $event)"
                            placeholder="如: 表情差分1, 表情差分2……"
                        />
                    </div>
                    <div class="form-group">
                        <label>内容</label>
                        <input
                            class="filter-text-input"
                            :value="formatArray(rule.filter.content)"
                            @change="updateFilter(rule, 'content', $event)"
                            placeholder="如: 于此同时，另一边……"
                        />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <input
                            class="filter-text-input"
                            :value="formatArray(rule.filter.note)"
                            @change="updateFilter(rule, 'note', $event)"
                            placeholder="如: 战斗轮消息……"
                        />
                    </div>

                    <div class="form-row two-col">
                        <div class="form-group">
                            <label>身份</label>
                            <select
                                :value="rule.filter.role || ''"
                                @change="updateFilter(rule, 'role', $event)"
                            >
                                <option value="">任意</option>
                                <option value="pl">玩家</option>
                                <option value="gm">主持人</option>
                                <option value="npc">NPC</option>
                                <option value="bot">骰子</option>
                                <option value="ob">观众</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>是否场外</label>
                            <select
                                :value="rule.filter.isOoc?.toString() || ''"
                                @change="
                                    updateFilter(rule, 'isOoc', $event, true)
                                "
                            >
                                <option value="">任意</option>
                                <option value="true">是</option>
                                <option value="false">否</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>是否指令</label>
                            <select
                                :value="rule.filter.isCommand?.toString() || ''"
                                @change="
                                    updateFilter(
                                        rule,
                                        'isCommand',
                                        $event,
                                        true,
                                    )
                                "
                            >
                                <option value="">任意</option>
                                <option value="true">是</option>
                                <option value="false">否</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>
                            选区快捷绑定
                            <span
                                v-if="filterStore.hasSelection"
                                class="inline-hint"
                            >
                                已选 {{ filterStore.selectedMessagesCount }} 条
                            </span>
                        </label>
                        <div class="form-row two-col">
                            <button
                                class="action-btn"
                                type="button"
                                @click="bindSelectedIds(rule)"
                            >
                                绑定选中
                            </button>
                            <button
                                class="action-btn"
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
    </div>
</template>

<script setup lang="ts">
import { ChevronRight, Eye, EyeOff, Plus, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { useStyleStore } from '@/stores/styleStore';
import { useLogStore } from '@/stores/logStore';
import { useFilter } from '@/composables/useFilter';
import type { ColorRule } from '@/types/config';
import type { MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { useWindowStore } from '@/stores/windowStore';

const styleStore = useStyleStore();
const logStore = useLogStore();
const filterStore = useFilter();
const windowStore = useWindowStore();
const expandedRules = ref<Set<string>>(new Set());

function toggleExpand(ruleId: string) {
    if (expandedRules.value.has(ruleId)) {
        expandedRules.value.delete(ruleId);
    } else {
        expandedRules.value.add(ruleId);
    }
}

// 基础操作
function handleCreateRule() {
    styleStore.addCustomRule('新规则');
    // 自动展开新建的规则（获取最后一个）
    setTimeout(() => {
        const rules = styleStore.customRules;
        if (rules.length > 0) {
            expandedRules.value.add(rules[rules.length - 1].ruleId);
        }
    }, 0);
}

function handleDeleteRule(rule: ColorRule) {
    const confirmed = window.confirm(
        `确定要删除规则“${rule.ruleName || '未命名规则'}”吗？本操作不可撤销`,
    );
    if (!confirmed) return;

    styleStore.deleteRule(rule.ruleId);
    expandedRules.value.delete(rule.ruleId);
}

function handleUpdate(ruleId: string, updates: Partial<ColorRule>) {
    styleStore.updateRule(ruleId, updates);
}

// 更新顶层属性
function updateColor(rule: ColorRule, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    handleUpdate(rule.ruleId, { color });
}

function toggleRuleActive(rule: ColorRule) {
    handleUpdate(rule.ruleId, { isActive: !rule.isActive });
}

// ---- Filter 编辑逻辑 ----
// 将数组或字符串格式化为逗号分隔的形式，方便展示在 input 中
function formatArray(val: any): string {
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
}

function updateFilter(
    rule: ColorRule,
    key: keyof ColorRule['filter'],
    event: Event,
    isBoolean = false,
) {
    const val = (
        event.target as HTMLInputElement | HTMLSelectElement
    ).value.trim();
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

function getAffectedMessageCount(rule: ColorRule) {
    return logStore.allMessages.filter((message) =>
        matchesMessageFilter(message, rule.filter),
    ).length;
}

function bindSelectedIds(rule: ColorRule) {
    const selectedMsgs = filterStore.selectedMessages.value;
    if (selectedMsgs.length === 0) return;

    const targetIds = selectedMsgs.map((m) => m.messageId);

    if (targetIds.length > 0) {
        const newFilter = { ...rule.filter, messageId: targetIds };
        styleStore.updateRule(rule.ruleId, { filter: newFilter });
    }
}

const getBindingCount = (val: any) => (Array.isArray(val) ? val.length : 1);

// 清除特定字段
const clearIds = (rule: ColorRule) => {
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

.rule-name-input {
    width: 100px;
    padding: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--active-accent);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
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

.icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 0;
    margin-left: 8px;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
    color: var(--icon-color);
}

.icon-button :deep(.ui-icon) {
    width: 16px;
    height: 16px;
}

.rule-header:hover .icon-button,
.rule-header:focus-within .icon-button {
    opacity: 1;
    pointer-events: auto;
}

.icon-button-warning:hover {
    color: var(--color-warning);
}

/* 展开内容区 */
.rule-body {
    display: flex;
    flex-direction: column;
    padding: 12px;
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

.form-group label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 4px;
}

.inline-hint {
    margin-left: 6px;
    color: var(--text-secondary);
}

.form-group input,
.form-group select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

.filter-text-input {
    width: calc(100% - 4px);
    margin-right: 4px;
    box-sizing: border-box;
}

.action-btn {
    width: 100%;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 13px;
    cursor: pointer;
}

.action-btn:hover {
    background: var(--hover-bg);
}

.binding-status {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
}
</style>
