<template>
    <div ref="rootRef" class="multi-tag-select">
        <div
            class="tag-control"
            :class="{ 'is-open': isOpen }"
            @pointerdown="handleControlPointerdown"
        >
            <div ref="chipListRef" class="chip-list">
                <span
                    v-for="tag in modelValue"
                    :key="tag"
                    class="tag-chip"
                >
                    <span class="chip-text" :title="labelOf(tag)">{{
                        labelOf(tag)
                    }}</span>
                    <button
                        type="button"
                        class="chip-remove icon-interactive"
                        tabindex="-1"
                        @pointerdown.stop
                        @click="removeTag(tag)"
                    >
                        <X class="chip-remove-icon" />
                    </button>
                </span>
                <input
                    ref="inputRef"
                    v-model="inputValue"
                    type="text"
                    class="tag-input"
                    :placeholder="modelValue.length === 0 ? placeholder : ''"
                    @keydown="handleKeydown"
                    @focus="open"
                    @blur="handleBlur"
                />
            </div>
            <ChevronDown class="chevron" :class="{ 'is-open': isOpen }" />
        </div>

        <Teleport to="body">
            <Transition name="dropdown">
                <div
                    v-if="isOpen"
                    ref="dropdownRef"
                    class="tag-dropdown"
                    :style="dropdownStyle"
                >
                    <button
                        v-for="(item, index) in listItems"
                        :key="item.label"
                        type="button"
                        class="dropdown-item"
                        :class="{ 'is-highlighted': index === highlightIndex }"
                        @mouseenter="highlightIndex = index"
                        @click="selectItem(item)"
                    >
                        <Check
                            class="check-icon"
                            :class="{ 'is-checked': isSelected(item.label) }"
                        />
                        <span class="item-label" :title="item.label">{{
                            item.label
                        }}</span>
                        <span
                            v-if="item.isCustom"
                            class="item-custom-hint"
                        >
                            手输关键词
                        </span>
                        <span
                            v-else-if="item.count !== undefined"
                            class="item-count"
                        >
                            {{ item.count }}
                        </span>
                    </button>
                    <div v-if="listItems.length === 0" class="dropdown-empty">
                        无匹配项
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import {
    computed,
    nextTick,
    ref,
    watch,
    type ComponentPublicInstance,
} from 'vue';
import { Check, ChevronDown, X } from '@lucide/vue';
import { onClickOutside, useEventListener } from '@vueuse/core';

export interface SelectOption {
    label: string;
    /** 提交给 modelValue 的值，缺省为 label（如身份筛选：label=玩家, value=pl） */
    value?: string;
    count?: number;
}

interface DropdownItem extends SelectOption {
    isCustom?: boolean;
}

function optionValue(option: Pick<SelectOption, 'label' | 'value'>): string {
    return option.value ?? option.label;
}

const props = withDefaults(
    defineProps<{
        modelValue: string[];
        options: SelectOption[];
        placeholder?: string;
    }>(),
    {
        placeholder: '',
    },
);

const emit = defineEmits<{
    'update:modelValue': [value: string[]];
}>();

const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const chipListRef = ref<ComponentPublicInstance | HTMLElement | null>(null);

const isOpen = ref(false);
const inputValue = ref('');
const highlightIndex = ref(0);
const dropdownStyle = ref<Record<string, string>>({});

// props 更新是异步的，同一 tick 内连续操作（如快速双击）会基于旧值计算而丢失选择，
// 因此以本地状态为同步真值，props 变化时再同步回来
const selected = ref<string[]>([...props.modelValue]);

watch(
    () => props.modelValue,
    (value) => {
        selected.value = [...value];
    },
);

const query = computed(() => inputValue.value.trim());

const filteredOptions = computed<SelectOption[]>(() => {
    if (!query.value) return props.options;
    return props.options.filter((option) =>
        option.label.includes(query.value),
    );
});

const listItems = computed<DropdownItem[]>(() => {
    const items: DropdownItem[] = filteredOptions.value.map((option) => ({
        ...option,
    }));

    const isKnown = props.options.some(
        (option) => optionValue(option) === query.value,
    );
    if (query.value && !isKnown) {
        items.push({ label: query.value, isCustom: true });
    }

    return items;
});

const labelByValue = computed(() => {
    const map = new Map<string, string>();
    for (const option of props.options) {
        map.set(optionValue(option), option.label);
    }
    return map;
});

function labelOf(value: string) {
    return labelByValue.value.get(value) ?? value;
}

function isSelected(label: string) {
    return selected.value.includes(label);
}

function open() {
    if (isOpen.value) return;
    isOpen.value = true;
    highlightIndex.value = 0;
    updatePosition();
}

function close() {
    if (!isOpen.value) return;
    commitInput();
    isOpen.value = false;
}

function updatePosition() {
    const control = rootRef.value?.querySelector('.tag-control');
    if (!control) return;

    const rect = control.getBoundingClientRect();
    dropdownStyle.value = {
        position: 'fixed',
        top: `${Math.round(rect.bottom + 4)}px`,
        left: `${Math.round(rect.left)}px`,
        minWidth: `${Math.round(rect.width)}px`,
    };
}

function handleControlPointerdown() {
    inputRef.value?.focus();
    open();
}

function selectItem(item: DropdownItem) {
    toggleTag(optionValue(item));
    inputValue.value = '';
    highlightIndex.value = 0;
    updatePosition();
}

function toggleTag(label: string) {
    if (isSelected(label)) {
        selected.value = selected.value.filter((tag) => tag !== label);
    } else {
        selected.value = [...selected.value, label];
        scrollChipsToBottom();
    }
    emit('update:modelValue', [...selected.value]);
}

function scrollChipsToBottom() {
    nextTick(() => {
        const source = chipListRef.value;
        const el =
            source instanceof HTMLElement
                ? source
                : (source?.$el as HTMLElement | undefined);
        if (el instanceof HTMLElement) {
            el.scrollTop = el.scrollHeight;
        }
    });
}

function removeTag(label: string) {
    selected.value = selected.value.filter((tag) => tag !== label);
    emit('update:modelValue', [...selected.value]);
}

function commitInput() {
    if (!query.value) return;
    if (!isSelected(query.value)) {
        selected.value = [...selected.value, query.value];
        scrollChipsToBottom();
        emit('update:modelValue', [...selected.value]);
    }
    inputValue.value = '';
    highlightIndex.value = 0;
}

function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp': {
            event.preventDefault();
            if (!isOpen.value) {
                open();
                return;
            }
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            const count = listItems.value.length;
            if (count === 0) return;
            highlightIndex.value =
                (highlightIndex.value + delta + count) % count;
            break;
        }
        case 'Enter':
            event.preventDefault();
            if (isOpen.value && listItems.value[highlightIndex.value]) {
                selectItem(listItems.value[highlightIndex.value]);
            } else {
                commitInput();
            }
            break;
        case ',':
        case '，':
            event.preventDefault();
            commitInput();
            break;
        case 'Backspace':
            if (!inputValue.value && selected.value.length > 0) {
                event.preventDefault();
                removeTag(selected.value[selected.value.length - 1]);
            }
            break;
        case 'Escape':
            isOpen.value = false;
            break;
    }
}

function handleBlur(event: FocusEvent) {
    const target = event.relatedTarget as Node | null;
    if (rootRef.value?.contains(target ?? null)) return;
    if (dropdownRef.value?.contains(target ?? null)) return;
    close();
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

watch(query, () => {
    highlightIndex.value = 0;
});

watch(isOpen, (openState) => {
    if (openState) {
        nextTick(updatePosition);
    }
});
</script>

<style scoped>
.multi-tag-select {
    position: relative;
    width: 100%;
    min-width: 0;
}

.tag-control {
    display: flex;
    align-items: center;
    padding: 3px 24px 3px 6px;
    min-height: 30px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: text;
    transition: border-color 0.15s;
}

.tag-control:hover {
    border-color: var(--active-accent);
}

.tag-control.is-open {
    border-color: var(--active-accent);
}

.chip-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    position: relative;
    /* 3 行 chip（20px 行高 + 4px 间距），超出滚动，避免选中过多撑高表单 */
    max-height: 68px;
    overflow-y: auto;
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
    /* 超长名称收缩到行宽内，由 chip-text 省略号截断 */
    min-width: 0;
    padding: 1px 2px 1px 6px;
    background: var(--bg-sidebar);
    border-radius: 10px;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 18px;
}

.chip-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
}

.chip-remove:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
}

.chip-remove-icon {
    width: 10px;
    height: 10px;
}

.chip-list::-webkit-scrollbar {
    width: 4px;
}

.chip-list::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 2px;
}

.tag-input {
    /* 尾随在 chip 流后面，空间不足时换行 */
    flex: 1 1 60px;
    min-width: 60px;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 20px;
    padding: 0;
}

.tag-input::placeholder {
    color: var(--text-muted);
}

.chevron {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: var(--text-muted);
    pointer-events: none;
    transition: transform 0.2s ease;
}

.chevron.is-open {
    transform: translateY(-50%) rotate(180deg);
}

.tag-dropdown {
    position: fixed;
    z-index: 1000;
    max-height: 240px;
    overflow-y: auto;
    padding: 4px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 6px 20px var(--box-shadow);
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 5px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-primary);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}

.dropdown-item.is-highlighted {
    background: var(--hover-bg);
}

.check-icon {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    color: transparent;
}

.check-icon.is-checked {
    color: var(--active-accent);
}

.item-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-count {
    flex-shrink: 0;
    font-size: 10px;
    padding: 1px 6px;
    background: var(--bg-sidebar);
    border-radius: 10px;
    color: var(--text-muted);
}

.item-custom-hint {
    flex-shrink: 0;
    font-size: 10px;
    padding: 1px 6px;
    background: var(--bg-sidebar);
    border-radius: 10px;
    color: var(--active-accent);
}

.dropdown-empty {
    padding: 10px 8px;
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
}

/* 弹层过渡 */
.dropdown-enter-active,
.dropdown-leave-active {
    transition:
        opacity 0.15s ease,
        transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* 消失动画期间不再拦截点击，避免误点下方的输入控件 */
.dropdown-leave-active {
    pointer-events: none;
}
</style>
