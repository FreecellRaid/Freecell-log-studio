<template>
    <div ref="rootRef" class="popover-date-picker">
        <div class="date-trigger" :class="{ 'is-open': isOpen }">
            <div class="segment-group" @pointerdown.stop>
                <input
                    v-model="segYear"
                    class="seg-input seg-year"
                    type="text"
                    inputmode="numeric"
                    maxlength="4"
                    placeholder="年"
                    @input="autoAdvance($event, 4)"
                    @blur="commitSegments"
                />
                <span class="seg-sep">/</span>
                <input
                    v-model="segMonth"
                    class="seg-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    placeholder="月"
                    @input="autoAdvance($event, 2, 2)"
                    @blur="commitSegments"
                />
                <span class="seg-sep">/</span>
                <input
                    v-model="segDay"
                    class="seg-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    placeholder="日"
                    @input="autoAdvance($event, 2, 4)"
                    @blur="commitSegments"
                />
                <span class="seg-gap"></span>
                <input
                    v-model="segHour"
                    class="seg-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    placeholder="时"
                    @input="autoAdvance($event, 2, 3)"
                    @blur="commitSegments"
                />
                <span class="seg-sep">:</span>
                <input
                    v-model="segMinute"
                    class="seg-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    placeholder="分"
                    @input="autoAdvance($event, 2)"
                    @blur="commitSegments"
                />
                <span class="seg-sep">:</span>
                <input
                    v-model="segSecond"
                    class="seg-input"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    placeholder="秒"
                    @input="autoAdvance($event, 2)"
                    @blur="commitSegments"
                />
            </div>
            <button
                type="button"
                class="calendar-button"
                title="打开日历选择"
                @pointerdown.prevent="toggle"
            >
                <CalendarIcon class="trigger-icon" />
            </button>
        </div>

        <Teleport to="body">
            <div
                v-show="isOpen"
                ref="dropdownRef"
                class="date-dropdown"
                :style="dropdownStyle"
            >
                <div class="date-header">
                    <button
                        type="button"
                        class="nav-button"
                        @click="
                            viewMode === 'days'
                                ? shiftMonth(-1)
                                : shiftYearPage(-1)
                        "
                    >
                        <ChevronLeft class="nav-icon" />
                    </button>
                    <button
                        type="button"
                        class="title-button"
                        @click="toggleViewMode"
                    >
                        <span class="month-title">
                            {{
                                viewMode === 'days'
                                    ? monthTitle
                                    : yearRangeTitle
                            }}
                        </span>
                        <ChevronDown
                            class="mode-icon"
                            :class="{ 'is-years': viewMode === 'years' }"
                        />
                    </button>
                    <button
                        type="button"
                        class="nav-button"
                        @click="
                            viewMode === 'days'
                                ? shiftMonth(1)
                                : shiftYearPage(1)
                        "
                    >
                        <ChevronRight class="nav-icon" />
                    </button>
                </div>

                <template v-if="viewMode === 'days'">
                    <div class="weekday-row">
                        <span
                            v-for="day in weekdays"
                            :key="day"
                            class="weekday-cell"
                        >
                            {{ day }}
                        </span>
                    </div>
                    <div class="day-grid">
                        <span
                            v-for="(cell, index) in dayCells"
                            :key="index"
                            class="day-cell"
                            :class="{
                                'is-empty': !cell,
                                'is-selected': cell && cell.isSelected,
                                'is-today': cell && cell.isToday,
                            }"
                            @click="cell && selectDate(cell.value)"
                        >
                            {{ cell ? cell.label : '' }}
                        </span>
                    </div>
                    <div class="quick-row">
                        <button
                            type="button"
                            class="quick-button"
                            :disabled="!modelValue"
                            @click="clearValue"
                        >
                            清除
                        </button>
                        <button
                            type="button"
                            class="quick-button"
                            :class="{ 'is-active': isTodaySelected }"
                            @click="selectToday"
                        >
                            今日
                        </button>
                    </div>
                </template>
                <div v-else class="year-grid">
                    <span
                        v-for="cell in yearCells"
                        :key="cell.year"
                        class="year-cell"
                        :class="{
                            'is-selected': cell.isSelected,
                            'is-today': cell.isToday,
                        }"
                        @click="selectYear(cell.year)"
                    >
                        {{ cell.year }}
                    </span>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type Ref } from 'vue';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from '@lucide/vue';
import { onClickOutside, useEventListener } from '@vueuse/core';

const props = withDefaults(
    defineProps<{
        modelValue: string;
        placeholder?: string;
    }>(),
    { placeholder: '' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const rootRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const dropdownStyle = ref<Record<string, string>>({});
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

const segYear = ref('');
const segMonth = ref('');
const segDay = ref('');
const segHour = ref('');
const segMinute = ref('');
const segSecond = ref('');
const viewMode = ref<'days' | 'years'>('days');

watch(
    () => props.modelValue,
    (value) => {
        syncSegmentsFromValue(value);
    },
    { immediate: true },
);

const segmentRefs = computed(() => {
    const root = rootRef.value;
    if (!root) return [];
    return Array.from(
        root.querySelectorAll('.seg-input'),
    ) as HTMLInputElement[];
});

function syncSegmentsFromValue(value: string) {
    if (!value) {
        segYear.value = '';
        segMonth.value = '';
        segDay.value = '';
        segHour.value = '';
        segMinute.value = '';
        segSecond.value = '';
        return;
    }
    const [datePart, timePart] = value.split('T');
    const [y = '', m = '', d = ''] = datePart.split('-');
    segYear.value = y;
    segMonth.value = m;
    segDay.value = d;
    if (timePart) {
        const [hh = '', mm = '', ss = ''] = timePart.split(':');
        segHour.value = hh;
        segMinute.value = mm;
        segSecond.value = ss;
    } else {
        segHour.value = '';
        segMinute.value = '';
        segSecond.value = '';
    }
    if (y) {
        const yn = Number(y);
        const mn = Number(m) - 1;
        if (yn && mn >= 0) {
            viewYear.value = yn;
            viewMonth.value = mn;
        }
    }
}

function autoAdvance(event: Event, length: number, smartMinAbove = 0) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const filled = value.length >= length;
    const singleEnough =
        !filled &&
        smartMinAbove > 0 &&
        value.length === 1 &&
        Number(value) >= smartMinAbove;
    if (!filled && !singleEnough) return;
    const refs = segmentRefs.value;
    const index = refs.indexOf(input);
    if (index >= 0 && index < refs.length - 1) {
        refs[index + 1].focus();
        refs[index + 1].select();
    }
}

// 某些输入路径（输入法/合成插入）会绕过 maxlength，这里兜底截断
watch(segYear, (v) => {
    if (v.length > 4) segYear.value = v.slice(0, 4);
});
watch([segMonth, segDay, segHour, segMinute, segSecond], () => {
    if (segMonth.value.length > 2) segMonth.value = segMonth.value.slice(0, 2);
    if (segDay.value.length > 2) segDay.value = segDay.value.slice(0, 2);
    if (segHour.value.length > 2) segHour.value = segHour.value.slice(0, 2);
    if (segMinute.value.length > 2)
        segMinute.value = segMinute.value.slice(0, 2);
    if (segSecond.value.length > 2)
        segSecond.value = segSecond.value.slice(0, 2);
});

const SEGMENT_RANGES: Record<string, { min: number; max: number }> = {
    month: { min: 1, max: 12 },
    day: { min: 1, max: 31 },
    hour: { min: 0, max: 23 },
    minute: { min: 0, max: 59 },
    second: { min: 0, max: 59 },
};

function commitSegments() {
    const check = (seg: Ref<string>, key: string) => {
        const raw = seg.value.trim();
        if (raw === '') return;
        const n = Number(raw);
        const range = SEGMENT_RANGES[key];
        if (!Number.isInteger(n) || n < range.min || n > range.max) {
            seg.value = '';
        }
    };
    check(segMonth, 'month');
    check(segDay, 'day');
    check(segHour, 'hour');
    check(segMinute, 'minute');
    check(segSecond, 'second');

    // 用户把所有段都清空，视为清除选择
    const allEmpty = [
        segYear,
        segMonth,
        segDay,
        segHour,
        segMinute,
        segSecond,
    ].every((seg) => seg.value.trim() === '');
    if (allEmpty) {
        emit('update:modelValue', '');
        return;
    }

    // 日期未填完整时是输入中间态（如自动跳格触发的 blur），提交空值会把
    // 已填的段清掉，这里直接跳过
    const value = assembledValue();
    if (value === null) return;
    emit('update:modelValue', value);
}

function assembledValue(): string | null {
    const y = segYear.value.trim();
    const m = segMonth.value.trim();
    const d = segDay.value.trim();
    if (!y || !m || !d) return null;
    const dateStr = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;
    const hh = segHour.value.trim();
    const mm = segMinute.value.trim();
    const ss = segSecond.value.trim();
    if (hh && mm && ss) {
        return `${dateStr}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
    }
    return dateStr;
}

function currentTimePart(): string | null {
    const hh = segHour.value.trim();
    const mm = segMinute.value.trim();
    const ss = segSecond.value.trim();
    if (!hh || !mm || !ss) return null;
    return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
}

const monthTitle = computed(
    () => `${viewYear.value}年${viewMonth.value + 1}月`,
);
const yearPageStart = computed(() => Math.floor(viewYear.value / 12) * 12);
const yearRangeTitle = computed(
    () => `${yearPageStart.value} - ${yearPageStart.value + 11}`,
);

interface Cell {
    label: string;
    value: string;
    isSelected: boolean;
    isToday: boolean;
    year: number;
}
const dayCells = computed<(Cell | null)[]>(() => {
    const firstDay = new Date(viewYear.value, viewMonth.value, 1);
    const daysInMonth = new Date(
        viewYear.value,
        viewMonth.value + 1,
        0,
    ).getDate();
    const lead = firstDay.getDay();
    const today = new Date();

    const cells: (Cell | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
        const value = formatDate(viewYear.value, viewMonth.value, day);
        cells.push({
            label: String(day),
            value,
            isSelected: value === props.modelValue.split('T')[0],
            isToday:
                today.getFullYear() === viewYear.value &&
                today.getMonth() === viewMonth.value &&
                today.getDate() === day,
            year: viewYear.value,
        });
    }
    return cells;
});

const yearCells = computed<Cell[]>(() => {
    const thisYear = new Date().getFullYear();
    const cells: Cell[] = [];
    for (let i = 0; i < 12; i++) {
        const year = yearPageStart.value + i;
        cells.push({
            label: String(year),
            value: String(year),
            isSelected: year === viewYear.value,
            isToday: year === thisYear,
            year,
        });
    }
    return cells;
});

function formatDate(year: number, month: number, day: number) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function shiftMonth(delta: number) {
    const next = new Date(viewYear.value, viewMonth.value + delta, 1);
    viewYear.value = next.getFullYear();
    viewMonth.value = next.getMonth();
}
function shiftYearPage(delta: number) {
    viewYear.value += delta * 12;
}
function toggleViewMode() {
    viewMode.value = viewMode.value === 'days' ? 'years' : 'days';
}
function selectDate(value: string) {
    const time = currentTimePart();
    emit('update:modelValue', time ? `${value}T${time}` : value);
    isOpen.value = false;
}
function clearValue() {
    emit('update:modelValue', '');
    isOpen.value = false;
}
function todayValue() {
    const now = new Date();
    return formatDate(now.getFullYear(), now.getMonth(), now.getDate());
}
const isTodaySelected = computed(
    () => props.modelValue.split('T')[0] === todayValue(),
);
function selectToday() {
    const value = todayValue();
    const [y, m] = value.split('-').map(Number);
    viewYear.value = y;
    viewMonth.value = m - 1;
    const time = currentTimePart();
    emit('update:modelValue', time ? `${value}T${time}` : value);
    isOpen.value = false;
}
function selectYear(year: number) {
    viewYear.value = year;
    viewMode.value = 'days';
}
const dropdownHeight = 330;
function updatePosition() {
    const trigger = rootRef.value?.querySelector('.date-trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const showBelow = rect.top < dropdownHeight + 12;
    dropdownStyle.value = {
        position: 'fixed',
        top: showBelow
            ? `${Math.round(rect.bottom + 4)}px`
            : `${Math.round(rect.top - dropdownHeight - 4)}px`,
        left: `${Math.round(rect.left)}px`,
        minWidth: `${Math.round(rect.width)}px`,
    };
}

function open() {
    if (isOpen.value) return;
    viewMode.value = 'days';
    if (props.modelValue) {
        const [datePart] = props.modelValue.split('T');
        const [y, m] = datePart.split('-').map(Number);
        if (y && m) {
            viewYear.value = y;
            viewMonth.value = m - 1;
        }
    }
    isOpen.value = true;
    updatePosition();
}

function close() {
    isOpen.value = false;
}

onClickOutside(
    rootRef,
    () => {
        close();
    },
    { ignore: [dropdownRef] },
);

useEventListener(
    window,
    'scroll',
    () => {
        if (isOpen.value) updatePosition();
    },
    true,
);
useEventListener('resize', () => {
    if (isOpen.value) updatePosition();
});

watch(isOpen, (openState) => {
    if (openState) {
        nextTick(updatePosition);
    }
});

function toggle() {
    if (isOpen.value) close();
    else open();
}
</script>

<style scoped>
.popover-date-picker {
    position: relative;
    width: 100%;
    min-width: 0;
}

.date-trigger {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
    padding: 3px 6px 3px 8px;
    min-height: 30px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transition: border-color 0.15s;
}

.date-trigger:hover,
.date-trigger.is-open,
.date-trigger:focus-within {
    border-color: var(--active-accent);
}

.segment-group {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 1px;
}

.seg-input {
    width: 22px;
    box-sizing: border-box;
    padding: 2px 0;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 12px;
    text-align: center;
    outline: none;
    font-variant-numeric: tabular-nums;
}

.seg-input.seg-year {
    width: 34px;
}

.seg-input::placeholder {
    color: var(--text-muted);
    font-size: 10px;
}

.seg-sep {
    color: var(--text-muted);
    font-size: 11px;
    flex-shrink: 0;
}

.seg-gap {
    width: 8px;
    flex-shrink: 0;
}

.calendar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
}

.calendar-button:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.trigger-icon {
    width: 14px;
    height: 14px;
}

.date-dropdown {
    position: fixed;
    z-index: 1000;
    width: 272px;
    box-sizing: border-box;
    padding: 8px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 6px 20px var(--box-shadow);
}

.date-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.month-title {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 600;
}

.title-button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
}

.title-button:hover {
    background: var(--hover-bg);
}

.mode-icon {
    width: 12px;
    height: 12px;
    color: var(--text-muted);
    transition: transform 0.2s ease;
}

.mode-icon.is-years {
    transform: rotate(180deg);
}

.year-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 4px 0;
}

.year-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    font-size: 13px;
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
}

.year-cell:hover {
    background: var(--hover-bg);
}

.year-cell.is-today {
    color: var(--active-accent);
    font-weight: 600;
}

.year-cell.is-selected {
    background: var(--active-accent);
    color: #ffffff;
}

.nav-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
}

.nav-button:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.nav-icon {
    width: 14px;
    height: 14px;
}

.quick-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.quick-button {
    flex: 1;
    padding: 5px 0;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-sidebar);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    text-align: center;
}

.quick-button:hover {
    background: var(--hover-bg);
}

.quick-button.is-active {
    color: var(--active-accent);
    border-color: var(--active-accent);
}

.quick-button:disabled {
    opacity: 0.45;
    cursor: default;
}

.quick-button:disabled:hover {
    background: var(--bg-sidebar);
}

.quick-button.is-active {
    color: var(--active-accent);
    border-color: var(--active-accent);
}

.weekday-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 2px;
}

.weekday-cell {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    padding: 3px 0;
}

.day-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
}

.day-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    font-size: 12px;
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
}

.day-cell:hover {
    background: var(--hover-bg);
}

.day-cell.is-empty {
    cursor: default;
}

.day-cell.is-empty:hover {
    background: transparent;
}

.day-cell.is-today {
    color: var(--active-accent);
    font-weight: 600;
}

.day-cell.is-selected {
    background: var(--active-accent);
    color: #ffffff;
}

/* 弹层过渡 */
.date-dropdown-enter-active,
.date-dropdown-leave-active {
    transition:
        opacity 0.15s ease,
        transform 0.15s ease;
}

.date-dropdown-enter-from,
.date-dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* 消失动画期间不再拦截点击 */
.date-dropdown-leave-active {
    pointer-events: none;
}
</style>
