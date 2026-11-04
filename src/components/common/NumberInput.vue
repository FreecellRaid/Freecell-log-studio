<template>
    <NumberFieldRoot
        ref="rootRef"
        class="number-input"
        :class="{ 'is-disabled': disabled }"
        :id="$attrs.id as string | undefined"
        :model-value="currentValue"
        :min="min"
        :max="max"
        :step="effectiveStep"
        :disabled="disabled"
        :starting-value="currentValue"
        :format-options="formatOptions"
        locale="en-US"
        allow-invalid
        disable-wheel-change
        @update:model-value="updateValue"
    >
        <NumberFieldDecrement class="step-button" aria-label="减小数值">
            <Minus aria-hidden="true" />
        </NumberFieldDecrement>
        <NumberFieldInput
            v-bind="$attrs"
            class="number-value"
            @blur="restoreInput"
            @keydown.enter.prevent="restoreInput"
        />
        <NumberFieldIncrement class="step-button" aria-label="增大数值">
            <Plus aria-hidden="true" />
        </NumberFieldIncrement>
    </NumberFieldRoot>
</template>

<script setup lang="ts">
import {
    computed,
    nextTick,
    ref,
    watch,
    type ComponentPublicInstance,
} from 'vue';
import { Minus, Plus } from '@lucide/vue';
import {
    NumberFieldRoot,
    NumberFieldInput,
    NumberFieldDecrement,
    NumberFieldIncrement,
} from 'reka-ui';
import { normalizeNumberInput } from '@/utils/numberInput';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
    defineProps<{
        modelValue: number;
        min?: number;
        max?: number;
        step?: number;
        disabled?: boolean;
    }>(),
    { step: 1, disabled: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const rootRef = ref<ComponentPublicInstance | null>(null);
const effectiveStep = computed(() =>
    Number.isFinite(props.step) && props.step > 0 ? props.step : 1,
);
const currentValue = computed(() =>
    normalizeNumberInput(props.modelValue, props),
);
const formatOptions: Intl.NumberFormatOptions = {
    useGrouping: false,
    maximumFractionDigits: 20,
};
watch(
    [
        () => props.modelValue,
        () => props.min,
        () => props.max,
        () => props.step,
    ],
    () => {
        if (!Object.is(props.modelValue, currentValue.value))
            emit('update:modelValue', currentValue.value);
    },
    { immediate: true },
);

// Reka 负责解析、按键和步进，项目封装只保证对外始终提交合法数值
function updateValue(value: number | undefined) {
    if (props.disabled) return;
    const normalized = normalizeNumberInput(
        value ?? NaN,
        props,
        currentValue.value,
    );
    if (normalized !== props.modelValue) emit('update:modelValue', normalized);
    void restoreInput();
}

// Reka 允许清空输入，确认或失焦后恢复合法值，即使数值未变化也更新显示
async function restoreInput(event?: Event) {
    if (event instanceof KeyboardEvent && event.isComposing) return;
    await nextTick();
    const input = rootRef.value?.$el?.querySelector('input[role="spinbutton"]');
    if (input instanceof HTMLInputElement)
        input.value = String(currentValue.value);
}
</script>

<style scoped>
.number-input {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-width: 0;
    min-height: 28px;
    padding: 4px;
    font-family: inherit;
    font-size: 13px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
}
.number-input:not(.is-disabled):hover,
.number-input:focus-within {
    border-color: var(--active-accent);
}
.number-value {
    flex: 1;
    width: 0;
    min-width: 0;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: center;
}
.step-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
}
.step-button svg {
    width: 14px;
    height: 14px;
}
.step-button:hover:not(:disabled) {
    background: var(--hover-bg);
    color: var(--text-primary);
}
.step-button:focus-visible {
    outline: 1px solid var(--active-accent);
}
.step-button:disabled {
    opacity: 0.4;
    cursor: default;
}
.is-disabled {
    opacity: 0.55;
}
</style>
