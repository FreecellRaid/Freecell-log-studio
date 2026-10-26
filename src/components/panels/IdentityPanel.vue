<template>
    <section class="panel">
        <div class="panel-header" @click="expanded = !expanded">
            <button
                type="button"
                class="section-toggle"
                :aria-expanded="expanded"
                aria-controls="coloring-identities"
                @click.stop="expanded = !expanded"
            >
                <span class="expand-icon" :class="{ 'is-expanded': expanded }">
                    <ChevronRight class="ui-icon" />
                </span>
                <span>{{ isPlayerMode ? '角色' : '账号' }}管理</span>
                <span class="section-count">{{ identityList.length }}</span>
            </button>
            <button
                class="icon-button icon-interactive"
                @click.stop="toggleDisplayMode"
                :title="isPlayerMode ? '切换到按账号管理' : '切换到按角色管理'"
            >
                <IdCard v-if="isPlayerMode" class="ui-icon" />
                <UserRound v-else class="ui-icon" />
            </button>
        </div>

        <div
            v-show="expanded"
            id="coloring-identities"
            class="panel-block-list"
        >
            <div class="list-header">
                <span class="header-cell">名称/账号</span>
                <span class="header-cell">发言</span>
                <span class="header-cell">身份</span>
                <span class="header-cell">染色</span>
            </div>

            <div
                v-for="item in identityList"
                :key="item.id"
                class="identity-item"
            >
                <div class="col-name" @dblclick="startEdit(item.id)">
                    <input
                        v-if="editingId === item.id"
                        v-model="editBuffer"
                        v-focus
                        class="form-control name-input"
                        v-click-outside="() => saveRename(item.id)"
                        @keydown.enter.exact.prevent="saveRename(item.id)"
                    />
                    <div v-else class="name-display" :title="item.id">
                        <span class="text">{{ item.id }}</span>
                    </div>
                </div>
                <div class="col-count">
                    <span class="count">{{ item.msgCount }}</span>
                </div>

                <div class="col-role">
                    <select
                        :value="item.role"
                        class="role-select"
                        @change="
                            (e) =>
                                updateRole(item.id, getRoleFromSelectEvent(e))
                        "
                    >
                        <option value="pl">玩家</option>
                        <option value="npc">NPC</option>
                        <option value="gm">主持人</option>
                        <option value="bot">骰子</option>
                        <option value="ob">观众</option>
                        <option value="unknown">其他</option>
                    </select>
                </div>

                <div class="col-color">
                    <div
                        class="color-picker-wrapper"
                        :style="{ backgroundColor: item.rule.style.color }"
                    >
                        <input
                            type="color"
                            :value="item.rule.style.color"
                            @input="
                                (e) =>
                                    updateColor(
                                        item.rule.ruleId,
                                        (e.target as HTMLInputElement).value,
                                    )
                            "
                        />
                    </div>
                </div>
            </div>

            <div v-if="identityList.length === 0" class="panel-empty-hint">
                暂无身份数据
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronRight, IdCard, UserRound } from '@lucide/vue';
import { useStyleStore } from '@/stores/project/styleStore';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import type { RoleType } from '@/types/log';
import type { ColorMode, StyleRule } from '@/types/style';
import {
    buildIdentityStats,
    collectMessageIdsByIdentity,
} from '@/editor/identity';
import { vClickOutside } from '@/directives/clickOutside';

interface IdentityListItem {
    id: string;
    msgCount: number;
    role: RoleType;
    rule: StyleRule;
}

const expanded = defineModel<boolean>('expanded', { default: true });

const styleStore = useStyleStore();
const logStore = useLogStore();
const logCommands = useLogCommands();
const localDisplayMode = ref<ColorMode>(styleStore.viewSettings.colorMode);
const editingId = ref<string | null>(null);
const editBuffer = ref('');

const isPlayerMode = computed(() => localDisplayMode.value === 'playerName');

const identityList = computed<IdentityListItem[]>(() => {
    const mode = localDisplayMode.value;
    const messages = logStore.allMessages;
    const stats = buildIdentityStats(messages, mode);

    const result: IdentityListItem[] = [];
    for (const [id, data] of stats.entries()) {
        const rule = styleStore.systemRules.find((r) => r.filter[mode] === id);
        if (rule) {
            result.push({
                id,
                msgCount: data.count,
                role: data.role,
                rule,
            });
        }
    }
    return result;
});

// 切换本地显示模式 (不影响全局 Store)
function toggleDisplayMode() {
    localDisplayMode.value =
        localDisplayMode.value === 'playerName' ? 'account' : 'playerName';
}

function startEdit(id: string) {
    editingId.value = id;
    editBuffer.value = id;
}

function saveRename(oldVal: string) {
    const newVal = editBuffer.value.trim();
    if (!newVal || newVal === oldVal) {
        editingId.value = null;
        return;
    }

    const mode = localDisplayMode.value;
    logCommands.renameIdentity(mode, oldVal, newVal);
    editingId.value = null;
}

function updateRole(id: string, newRole: RoleType) {
    const targetIds = getMessageIdsForIdentity(id);
    if (targetIds.size > 0) {
        logCommands.batchUpdateMessages(targetIds, { role: newRole });
    }
}

function updateColor(ruleId: string, newColor: string) {
    const rule = styleStore.rules.find((item) => item.ruleId === ruleId);
    if (!rule) return;
    styleStore.updateRule(ruleId, {
        style: { ...rule.style, color: newColor },
    });
}

function getMessageIdsForIdentity(id: string) {
    return collectMessageIdsByIdentity(
        logStore.allMessages,
        localDisplayMode.value,
        id,
    );
}

function getRoleFromSelectEvent(event: Event): RoleType {
    const value = (event.target as HTMLSelectElement).value;
    return value as RoleType;
}

const vFocus = {
    mounted: (el: HTMLElement) => el.focus(),
};
</script>

<style scoped>
.list-header,
.identity-item {
    display: grid;
    grid-template-columns:
        minmax(0, 1fr)
        clamp(36px, 14%, 56px)
        clamp(58px, 24%, 82px)
        clamp(34px, 12%, 44px);
    align-items: center;
    column-gap: 8px;
    padding: 4px 10px;
}

.list-header {
    font-size: 11px;
    color: var(--text-muted);
    position: sticky;
    top: 0;
    background-color: var(--bg-sidebar);
    z-index: 1;
}

.header-cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 4px 2px;
}

.identity-item {
    transition: background-color 0.2s;
}

.identity-item:hover {
    background-color: var(--hover-bg);
}

/* --- 各列样式 --- */
.col-name {
    display: flex;
    align-items: center;
    overflow: hidden;
    min-width: 0;
}

.col-count {
    display: flex;
    align-items: center;
    overflow: hidden;
    min-width: 0;
}

.col-role {
    overflow: hidden;
    min-width: 0;
}

.col-color {
    display: flex;
    justify-content: center;
    min-width: 0;
}

.name-display {
    display: flex;
    align-items: center;
    cursor: text;
    width: 100%;
    min-width: 0;
}

.name-display .text {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
}

.count {
    font-size: 10px;
    min-width: 0;
    max-width: 100%;
    padding: 2px 6px;
    background: var(--bg-secondary);
    border-radius: 10px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.name-input {
    width: 100%;
    box-sizing: border-box;
    padding: 4px;
    background: var(--bg-workspace);
    border: 1px solid var(--active-accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
}

.color-picker-wrapper {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
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

.role-select {
    width: 100%;
    box-sizing: border-box;
    padding: 4px 2px;
    background-color: var(--bg-workspace);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    outline: none;
}

/* 原生下拉菜单在 Windows 上可能使用系统背景，需同时指定选项的前景和背景色。 */
.role-select option {
    background-color: var(--bg-workspace);
    color: var(--text-primary);
}
</style>
