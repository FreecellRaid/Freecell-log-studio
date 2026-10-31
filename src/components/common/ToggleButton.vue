<template>
    <component
        :is="usesOptionValue ? RadioGroupItem : SwitchRoot"
        v-bind="controlProps"
        class="toggle-button"
        :disabled="disabled"
        @update:model-value="updateSwitch"
        @select="selectOption"
    >
        <span class="toggle-button-track" aria-hidden="true">
            <span class="toggle-button-thumb"></span>
        </span>
        <span v-if="$slots.default" class="toggle-button-label">
            <slot></slot>
        </span>
    </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RadioGroupItem, SwitchRoot } from 'reka-ui';

type ToggleValue = boolean | string | number | null | undefined;

const props = withDefaults(
    defineProps<{
        modelValue: ToggleValue;
        value?: string | number | boolean;
        disabled?: boolean;
    }>(),
    {
        value: undefined,
        disabled: false,
    },
);

const emit = defineEmits<{
    'update:modelValue': [value: ToggleValue];
}>();

const usesOptionValue = computed(() => props.value !== undefined);
const controlProps = computed(() =>
    usesOptionValue.value
        ? { value: props.value }
        : { modelValue: Boolean(props.modelValue) },
);

function updateSwitch(value: boolean) {
    if (!props.disabled && !usesOptionValue.value) {
        emit('update:modelValue', value);
    }
}

// 选项模式由外层单选组统一管理焦点，保留原有的值绑定接口。
function selectOption() {
    if (
        !props.disabled &&
        usesOptionValue.value &&
        props.modelValue !== props.value
    ) {
        emit('update:modelValue', props.value);
    }
}
</script>

<style scoped>
.toggle-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.toggle-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
}

.toggle-button-track {
    position: relative;
    width: 30px;
    height: 18px;
    flex: 0 0 auto;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background-color: var(--inactive-accent);
}

.toggle-button-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--bg-workspace);
    box-shadow: 0 1px 2px var(--box-shadow);
    transition: transform 0.15s ease;
}

.toggle-button-label {
    min-width: 0;
    line-height: 1.35;
}

.toggle-button[data-state='checked'] .toggle-button-track {
    border-color: var(--active-accent);
    background-color: var(--active-accent);
}

.toggle-button[data-state='checked'] .toggle-button-thumb {
    transform: translateX(13px);
}

.toggle-button:focus-visible {
    outline: 2px solid var(--active-accent);
    outline-offset: 2px;
}
</style>
