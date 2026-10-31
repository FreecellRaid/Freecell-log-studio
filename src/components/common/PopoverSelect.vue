<template>
    <div ref="rootRef" class="popover-select">
        <SelectRoot
            v-model:open="isOpen"
            :model-value="selectedKey"
            :disabled="disabled"
            @update:model-value="selectKey"
        >
            <SelectTrigger v-bind="$attrs" class="select-trigger">
                <SelectValue class="trigger-label">
                    {{ selectedLabel }}
                </SelectValue>
                <ChevronDown class="chevron" />
            </SelectTrigger>
            <SelectPortal v-if="portalTarget" :to="portalTarget">
                <SelectContent
                    class="popover-select-dropdown"
                    data-popover-select-content
                    position="popper"
                    align="start"
                    :side-offset="4"
                    :collision-padding="8"
                    @keydown.esc.stop="isOpen = false"
                >
                    <SelectViewport class="popover-select-viewport">
                        <SelectItem
                            v-for="(item, index) in options"
                            :key="index"
                            :value="String(index)"
                            :text-value="item.label"
                            class="dropdown-item"
                        >
                            <Check
                                class="check-icon"
                                :class="{
                                    'is-checked': index === selectedIndex,
                                }"
                            />
                            <span class="item-label" :title="item.label">
                                <SelectItemText>
                                    {{ item.label }}
                                </SelectItemText>
                            </span>
                        </SelectItem>
                    </SelectViewport>
                </SelectContent>
            </SelectPortal>
        </SelectRoot>
    </div>
</template>

<script lang="ts">
export interface PopoverOption<T> {
    label: string;
    value: T;
}
</script>

<script setup lang="ts" generic="T">
import { computed, onMounted, ref } from 'vue';
import { Check, ChevronDown } from '@lucide/vue';
import {
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport,
} from 'reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    modelValue: T;
    options: readonly PopoverOption<T>[];
    disabled?: boolean;
}>();
const emit = defineEmits<{
    'update:modelValue': [value: T];
}>();
const rootRef = ref<HTMLElement | null>(null);
const portalTarget = ref<HTMLElement>();
const isOpen = ref(false);
const selectedIndex = computed(() =>
    props.options.findIndex((item) => item.value === props.modelValue),
);
// Reka 将空字符串保留为清空选择的标记，使用内部键值映射，
// 在不改变组件对外接口的前提下保留空字符串、false 和 undefined 等选项值。
const selectedKey = computed(() =>
    selectedIndex.value < 0 ? undefined : String(selectedIndex.value),
);
const selectedLabel = computed(
    () => props.options[selectedIndex.value]?.label ?? '',
);
function selectKey(key: unknown) {
    const index = Number(key);
    if (typeof key !== 'string' || key === '' || !Number.isInteger(index))
        return;
    const option = props.options[index];
    if (option) emit('update:modelValue', option.value);
}
onMounted(() => {
    // 将弹层挂载到所属对话框内以保持焦点约束，并继承编辑器主题
    portalTarget.value =
        rootRef.value?.closest<HTMLElement>('.modal-backdrop') ??
        document.getElementById('editor') ??
        undefined;
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
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s;
    background-color: transparent;
    outline: none;
}

.select-trigger.form-control {
    padding: 6px 8px;
    font-size: 13px;
}

.select-trigger:hover:not(:disabled),
.select-trigger:focus,
.select-trigger[data-state='open'] {
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
}

:global(.popover-select-dropdown) {
    z-index: 100;
    min-width: var(--reka-select-trigger-width);
    max-width: var(--reka-select-content-available-width);
    max-height: min(240px, var(--reka-select-content-available-height));
    overflow: hidden;
    padding: 4px;
    background: var(--bg-topbar);
    border: 1px solid var(--border-color);
    border-radius: 4px;
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
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    outline: none;
    user-select: none;
}

.dropdown-item[data-highlighted] {
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

:global(.popover-select-viewport) {
    max-height: min(
        230px,
        calc(var(--reka-select-content-available-height) - 10px)
    );
    overflow-y: auto;
}
.select-trigger:disabled {
    opacity: 0.55;
    cursor: default;
}
</style>
