<template>
    <div ref="rootRef" class="popover-select">
        <button
            type="button"
            class="select-trigger"
            :class="{ 'is-open': isOpen }"
            @pointerdown.prevent="toggle"
            @keydown="handleKeydown"
        >
            <span class="trigger-label">{{ selectedLabel }}</span>
            <ChevronDown class="chevron" :class="{ 'is-open': isOpen }" />
        </button>

        <Teleport to="body">
            <Transition name="popover-dropdown">
                <div
                    v-if="isOpen"
                    ref="dropdownRef"
                    class="select-dropdown"
                    :style="dropdownStyle"
                >
                    <button
                        v-for="(item, index) in options"
                        :key="String(item.value)"
                        type="button"
                        class="dropdown-item"
                        :class="{ 'is-highlighted': index === highlightIndex }"
                        @mouseenter="highlightIndex = index"
                        @click="select(item.value)"
                    >
                        <Check
                            class="check-icon"
                            :class="{ 'is-checked': item.value === modelValue }"
                        />
                        <span class="item-label" :title="item.label">{{
                            item.label
                        }}</span>
                    </button>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts" generic="T">
import { computed, nextTick, ref, watch } from 'vue';
import { Check, ChevronDown } from '@lucide/vue';
import { onClickOutside, useEventListener } from '@vueuse/core';

export interface PopoverOption<T> {
    label: string;
    value: T;
}

const props = defineProps<{
    modelValue: T;
    options: PopoverOption<T>[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: T];
}>();

const rootRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const isOpen = ref(false);
const highlightIndex = ref(0);
const dropdownStyle = ref<Record<string, string>>({});

const selectedLabel = computed(() => {
    const match = props.options.find(
        (item) => item.value === props.modelValue,
    );
    return match ? match.label : '';
});

function open() {
    if (isOpen.value) return;
    isOpen.value = true;

    const current = props.options.findIndex(
        (item) => item.value === props.modelValue,
    );
    highlightIndex.value = current >= 0 ? current : 0;
    updatePosition();
}

function close() {
    isOpen.value = false;
}

function toggle() {
    if (isOpen.value) {
        close();
    } else {
        open();
    }
}

function updatePosition() {
    const trigger = rootRef.value?.querySelector('.select-trigger');
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    dropdownStyle.value = {
        position: 'fixed',
        top: `${Math.round(rect.bottom + 4)}px`,
        left: `${Math.round(rect.left)}px`,
        minWidth: `${Math.round(rect.width)}px`,
    };
}

function select(value: T) {
    emit('update:modelValue', value);
    close();
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
            const count = props.options.length;
            if (count === 0) return;
            highlightIndex.value =
                (highlightIndex.value + delta + count) % count;
            break;
        }
        case 'Enter':
        case ' ':
            event.preventDefault();
            if (isOpen.value) {
                select(props.options[highlightIndex.value].value);
            } else {
                open();
            }
            break;
        case 'Escape':
            close();
            break;
    }
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
</script>

<style scoped>
.popover-select {
    position: relative;
    width: 100%;
    min-width: 0;
}

.select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
    padding: 5px 8px;
    min-height: 28px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s;
}

.select-trigger:hover,
.select-trigger.is-open {
    border-color: var(--active-accent);
}

.trigger-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chevron {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--text-muted);
    transition: transform 0.2s ease;
}

.chevron.is-open {
    transform: rotate(180deg);
}

.select-dropdown {
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

/* 弹层过渡 */
.popover-dropdown-enter-active,
.popover-dropdown-leave-active {
    transition:
        opacity 0.15s ease,
        transform 0.15s ease;
}

.popover-dropdown-enter-from,
.popover-dropdown-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* 消失动画期间不再拦截点击，避免误点下方的输入控件 */
.popover-dropdown-leave-active {
    pointer-events: none;
}
</style>
