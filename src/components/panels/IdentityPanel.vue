<template>
    <div class="panel" @pointerdown="windowStore.setFocus('identity')">
        <div class="panel-header">
            <div class="header-title">
                <h3>{{ isPlayerMode ? '角色管理' : '账号管理' }}</h3>
            </div>
            <button
                class="panel-header-action-button icon-interactive"
                @click="toggleDisplayMode"
                :title="isPlayerMode ? '切换到按账号管理' : '切换到按角色管理'"
            >
                <IdCard v-if="isPlayerMode" class="ui-icon" />
                <UserRound v-else class="ui-icon" />
            </button>
        </div>

        <div class="panel-block-list">
            <div class="list-header" :style="gridStyle">
                <span class="header-cell">名称/账号</span>
                <div
                    class="col-resize-handle"
                    @mousedown="startColResize(0, $event)"
                ></div>
                <span class="header-cell">发言</span>
                <div
                    class="col-resize-handle"
                    @mousedown="startColResize(1, $event)"
                ></div>
                <span class="header-cell">身份</span>
                <div
                    class="col-resize-handle"
                    @mousedown="startColResize(2, $event)"
                ></div>
                <span class="header-cell">染色</span>
            </div>

            <div
                v-for="item in identityList"
                :key="item.id"
                class="identity-item"
                :style="gridStyle"
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
                    <div v-else class="name-display" :title="item.id">
                        <span class="text">{{ item.id }}</span>
                    </div>
                </div>
                <div class="col-divider"></div>
                <div class="col-count">
                    <span class="count">{{ item.msgCount }}</span>
                </div>
                <div class="col-divider"></div>

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
                <div class="col-divider"></div>

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
import { ref, reactive, computed, watch } from 'vue';
import { IdCard, UserRound } from '@lucide/vue';
import { useStyleStore } from '@/stores/styleStore';
import { useLogStore } from '@/stores/logStore';
import { useUiStore, PANEL_MAX_WIDTH } from '@/stores/uiStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import type { RoleType } from '@/types/log';
import type { ColorMode, ColorRule } from '@/types/config';
import { useWindowStore } from '@/stores/windowStore';
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
const uiStore = useUiStore();
const historyStore = useHistoryStore();
const messageEditorStore = useMessageEditorStore();
const windowStore = useWindowStore();
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

// --- 列宽拖拽 ---
// 4 列总宽始终 = 面板可用宽度，拖手柄是相邻两列此消彼长
// Grid 7 格: 名称 | handle | 发言 | handle | 身份 | handle | 染色

const MIN_COL_WIDTH = 30;
const HANDLE_COUNT = 3;
const HANDLE_WIDTH = 4; // 与 CSS .col-resize-handle / .col-divider 的 width 一致
const ROW_PADDING_X = 8; // 与 CSS .list-header / .identity-item 的 padding 水平值一致
const GRID_OVERHEAD = HANDLE_COUNT * HANDLE_WIDTH + ROW_PADDING_X * 2;

// 身份列的最小宽度：需容纳最宽选项 "主持人"（3 CJK + select padding/arrow）
const MIN_ROLE_WIDTH = 65;
// 染色列固定宽度（色块 20px + 余量）
const COLOR_COL_WIDTH = 36;

/** 面板可用于 4 列的净宽度 */
function availableColSpace(): number {
    return uiStore.leftPanelWidth - GRID_OVERHEAD;
}

/** 列总宽 */
function totalColWidth(): number {
    return colWidths.reduce((s, w) => s + w, 0);
}

/** 列总宽 + 开销 = 面板所需最小宽度 */
function requiredPanelWidth(): number {
    return totalColWidth() + GRID_OVERHEAD;
}

/** 用隐藏 canvas 测量文本像素宽度 */
const measureCanvas = document.createElement('canvas');
function measureText(text: string, font: string): number {
    const ctx = measureCanvas.getContext('2d')!;
    ctx.font = font;
    return Math.ceil(ctx.measureText(text).width);
}

/** 根据当前数据计算各列理想宽度 */
function calcIdealColWidths(
    items: IdentityListItem[],
): [number, number, number, number] {
    if (items.length === 0) {
        return [80, 40, MIN_ROLE_WIDTH, COLOR_COL_WIDTH];
    }

    // 名称列：最长名称文字宽度 + 余量
    const nameFont = '13px sans-serif';
    const maxNameW = items.reduce(
        (max, item) => Math.max(max, measureText(item.id, nameFont)),
        0,
    );
    const nameCol = Math.max(MIN_COL_WIDTH, maxNameW + 8);

    // 发言列：最大数字宽度 + badge padding
    const countFont = '10px sans-serif';
    const maxCountW = items.reduce(
        (max, item) =>
            Math.max(max, measureText(String(item.msgCount), countFont)),
        0,
    );
    const countCol = Math.max(MIN_COL_WIDTH, maxCountW + 16); // badge padding 2×6 + 余量

    // 身份列：固定最小宽度（select 下拉框需要容纳最宽选项）
    const roleCol = MIN_ROLE_WIDTH;

    return [nameCol, countCol, roleCol, COLOR_COL_WIDTH];
}

// 初始化列宽
const colWidths = reactive([80, 40, MIN_ROLE_WIDTH, COLOR_COL_WIDTH]);

// 数据变化时自动调整列宽和侧边栏
watch(
    identityList,
    (items) => {
        const [nameW, countW, roleW, colorW] = calcIdealColWidths(items);
        const idealTotal = nameW + countW + roleW + colorW;
        const available = availableColSpace();

        if (idealTotal <= available) {
            // 空间足够：各列用理想宽度，名称列吃掉剩余
            colWidths[1] = countW;
            colWidths[2] = roleW;
            colWidths[3] = colorW;
            colWidths[0] = available - countW - roleW - colorW;
        } else {
            // 空间不够：优先保持当前用户设定的侧边栏宽度
            colWidths[1] = countW;
            colWidths[2] = roleW;
            colWidths[3] = colorW;
            const remainingForName = available - (countW + roleW + colorW);

            if (remainingForName >= MIN_COL_WIDTH) {
                // 只要还能满足最小宽度，就直接在内部压缩名称列，不推侧边栏
                colWidths[0] = remainingForName;
            } else {
                colWidths[0] = MIN_COL_WIDTH;
                const minimalNeeded =
                    MIN_COL_WIDTH + countW + roleW + colorW + GRID_OVERHEAD;
                if (uiStore.leftPanelWidth < minimalNeeded) {
                    uiStore.leftPanelWidth = Math.min(
                        PANEL_MAX_WIDTH,
                        minimalNeeded,
                    );
                }
            }
        }
    },
    { immediate: true },
);

const gridStyle = computed(() => ({
    gridTemplateColumns: colWidths
        .map((w) => `${w}px`)
        .join(` ${HANDLE_WIDTH}px `),
}));

/** 拖拽列手柄：左列和右列此消彼长，触底后推宽侧边栏 */
function startColResize(colIndex: number, e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = colWidths[colIndex];
    const startRight = colWidths[colIndex + 1];
    const startPanelWidth = uiStore.leftPanelWidth;

    // 身份列(index 2)有更高的最小宽度
    const minLeft = MIN_COL_WIDTH;
    const minRight = colIndex + 1 === 2 ? MIN_ROLE_WIDTH : MIN_COL_WIDTH;

    function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - startX;
        const newLeft = Math.max(minLeft, startLeft + delta);
        const newRight = startRight - delta;

        if (newRight >= minRight) {
            colWidths[colIndex] = newLeft;
            colWidths[colIndex + 1] = newRight;
        } else {
            // 右列触底，推宽侧边栏
            colWidths[colIndex] = newLeft;
            colWidths[colIndex + 1] = minRight;
            const needed = requiredPanelWidth();
            uiStore.leftPanelWidth = Math.min(
                PANEL_MAX_WIDTH,
                Math.max(startPanelWidth, needed),
            );
        }

        // 反向拖时缩回侧边栏
        if (delta < 0 && uiStore.leftPanelWidth > startPanelWidth) {
            const needed = requiredPanelWidth();
            if (needed < uiStore.leftPanelWidth) {
                uiStore.leftPanelWidth = Math.max(startPanelWidth, needed);
            }
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// 侧边栏宽度变化时，名称列（第一列）吸收差值
watch(
    () => uiStore.leftPanelWidth,
    () => {
        const diff = availableColSpace() - totalColWidth();
        if (diff !== 0) {
            colWidths[0] = Math.max(MIN_COL_WIDTH, colWidths[0] + diff);
        }
    },
);
</script>

<style scoped>
/* --- 共享 grid 布局 (7格: col handle col handle col handle col) --- */
.list-header,
.identity-item {
    display: grid;
    /* gridTemplateColumns 由 :style="gridStyle" 动态设置 */
    align-items: center;
    padding: 4px 8px;
}

.list-header {
    font-size: 11px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-light);
    text-align: center;
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
    border-bottom: 1px dotted var(--border-light);
    transition: background-color 0.2s;
}

.identity-item:hover {
    background-color: var(--hover-bg);
}

/* --- 列拖拽手柄 (表头) --- */
.col-resize-handle {
    width: 4px;
    height: 100%;
    cursor: col-resize;
    position: relative;
}

.col-resize-handle::after {
    content: '';
    position: absolute;
    top: 25%;
    bottom: 25%;
    left: 1px;
    width: 1px;
    background-color: var(--border-color);
    transition: background-color 0.15s;
}

.col-resize-handle:hover::after {
    left: 0;
    width: 4px;
    background-color: var(--active-accent);
    border-radius: 2px;
}

/* --- 数据行列分隔 (纯视觉对齐, 不可拖) --- */
.col-divider {
    width: 4px;
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
    justify-content: center;
    overflow: hidden;
}

.col-role {
    overflow: hidden;
}

.col-color {
    display: flex;
    justify-content: center;
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
    padding: 2px 6px;
    background: var(--bg-secondary);
    border-radius: 10px;
    color: var(--text-muted);
    white-space: nowrap;
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
    padding: 4px 2px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
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
</style>
