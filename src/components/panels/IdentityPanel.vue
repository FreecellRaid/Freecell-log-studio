<template>
    <div class="panel">
        <div class="panel-header">
            <div class="header-title">
                <h3>{{ isPlayerMode ? '角色管理' : '账号管理' }}</h3>
            </div>
            <button
                class="header-action-button icon-interactive"
                @click="toggleDisplayMode"
                :title="isPlayerMode ? '切换到按账号管理' : '切换到按角色管理'"
            >
                <IdCard v-if="isPlayerMode" class="ui-icon" />
                <UserRound v-else class="ui-icon" />
            </button>
        </div>

        <div class="panel-block-list">
            <div class="list-header">
                <span>名称/账号</span>
                <span>发言</span>
                <span>身份</span>
                <span>染色</span>
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
                        class="name-input"
                        @blur="saveRename(item.id)"
                        @keyup.enter="saveRename(item.id)"
                    />
                    <div v-else class="name-display">
                        <span class="text">{{ item.id }}</span>
                    </div>
                </div>
                <div class="col-count">
                    <div class="name-display">
                        <span class="count">{{ item.msgCount }}</span>
                    </div>
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
                        <option value="unknown">未知</option>
                    </select>
                </div>

                <div class="col-color">
                    <div
                        class="color-picker-wrapper"
                        :style="{ backgroundColor: item.rule.color }"
                    >
                        <input
                            type="color"
                            :value="item.rule.color"
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
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { IdCard, UserRound } from '@lucide/vue';
import { useStyleStore } from '@/stores/styleStore';
import { useLogStore } from '@/stores/logStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import type { RoleType } from '@/types/log';
import type { ColorMode, ColorRule } from '@/types/config';
import {
    buildIdentityStats,
    collectMessageIdsByIdentity,
    findFirstRoleByIdentity,
} from '@/editor/identity';

interface IdentityListItem {
    id: string;
    msgCount: number;
    role: RoleType;
    rule: ColorRule;
}

const styleStore = useStyleStore();
const logStore = useLogStore();
const historyStore = useHistoryStore();
const messageEditorStore = useMessageEditorStore();
const localDisplayMode = ref<ColorMode>(styleStore.viewSettings.colorMode); // 局部显示模式
const editingId = ref<string | null>(null); // 当前正在编辑的 ID
const editBuffer = ref(''); // 编辑缓冲区

/** 是否为角色显示模式（基于局部状态） */
const isPlayerMode = computed(() => localDisplayMode.value === 'playerName');

/** 聚合生成的身份列表 */
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

/** 切换本地显示模式 (不影响全局 Store) */
function toggleDisplayMode() {
    localDisplayMode.value =
        localDisplayMode.value === 'playerName' ? 'account' : 'playerName';
}

/** 开启编辑状态 */
function startEdit(id: string) {
    editingId.value = id;
    editBuffer.value = id;
}

/** 执行改名并同步更新消息数据与染色规则 */
function saveRename(oldVal: string) {
    const newVal = editBuffer.value.trim();
    if (!newVal || newVal === oldVal) {
        editingId.value = null;
        return;
    }

    const mode = localDisplayMode.value;
    const sourceIds = getMessageIdsForIdentity(oldVal);
    const existingTargetIds = getMessageIdsForIdentity(newVal);

    // 确定合并后的角色身份
    const mergedRole =
        existingTargetIds.size > 0
            ? (getRoleForIdentity(newVal) ?? getRoleForIdentity(oldVal))
            : null;

    if (sourceIds.size > 0) {
        historyStore.captureSnapshot();
        historyStore.runWithoutCapture(() => {
            messageEditorStore.batchUpdateMessages(
                sourceIds,
                buildRenameUpdate(mode, newVal),
            );
            const isMerged = styleStore.updateSystemRuleTarget(
                mode,
                oldVal,
                newVal,
            );
            if (isMerged && mergedRole) {
                const mergedIds = new Set<string>([
                    ...sourceIds,
                    ...existingTargetIds,
                ]);
                messageEditorStore.batchUpdateMessages(mergedIds, {
                    role: mergedRole,
                });
            }
        });
    }
    editingId.value = null;
}

function updateRole(id: string, newRole: RoleType) {
    const targetIds = getMessageIdsForIdentity(id);
    if (targetIds.size > 0) {
        messageEditorStore.batchUpdateMessages(targetIds, { role: newRole });
    }
}

function updateColor(ruleId: string, newColor: string) {
    styleStore.updateRule(ruleId, { color: newColor });
}

function getMessageIdsForIdentity(id: string) {
    return collectMessageIdsByIdentity(
        logStore.allMessages,
        localDisplayMode.value,
        id,
    );
}
function getRoleForIdentity(id: string): RoleType | null {
    return findFirstRoleByIdentity(
        logStore.allMessages,
        localDisplayMode.value,
        id,
    );
}
function buildRenameUpdate(mode: ColorMode, value: string) {
    return mode === 'playerName' ? { playerName: value } : { account: value };
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
.list-header {
    display: grid;
    grid-template-columns: 60px 40px 50px 40px;
    padding: 8px 12px;
    font-size: 11px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-light);
    gap: 6px;
    text-align: center;
}

.identity-item {
    display: grid;
    grid-template-columns: 60px 40px 50px 40px;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px dotted var(--border-light);
    gap: 6px;
    transition: background-color 0.2s;
}

.identity-item:hover {
    background-color: var(--hover-bg);
}

.col-name {
    display: flex;
    align-items: center;
    overflow: hidden;
}

.name-display {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: text;
    width: 100%;
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
    padding: 2px 6px;
    background: var(--bg-secondary);
    border-radius: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
}

.name-input {
    width: 100%;
    box-sizing: border-box;
    padding: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--active-accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
}

.role-select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

.col-color {
    display: flex;
    justify-content: center;
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
</style>
