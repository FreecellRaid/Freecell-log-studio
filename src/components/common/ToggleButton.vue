<template>
    <button
        class="toggle-button"
        :class="{ 'is-checked': isChecked }"
        type="button"
        :role="role"
        :aria-checked="isChecked"
        :disabled="disabled"
        @click="toggle"
    >
        <span class="toggle-button-track" aria-hidden="true">
            <span class="toggle-button-thumb"></span>
        </span>
        <span v-if="$slots.default" class="toggle-button-label">
            <slot></slot>
        </span>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

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

const isChecked = computed(() => {
    if (usesOptionValue.value) {
        return props.modelValue === props.value;
    }

    return Boolean(props.modelValue);
});

const role = computed(() => (usesOptionValue.value ? 'radio' : 'switch'));

function toggle() {
    if (props.disabled) {
        return;
    }

    if (usesOptionValue.value) {
        if (!isChecked.value) {
            emit('update:modelValue', props.value);
        }
        return;
    }

    emit('update:modelValue', !isChecked.value);
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
    height: 16px;
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

.toggle-button.is-checked .toggle-button-track {
    border-color: var(--active-accent);
    background-color: var(--active-accent);
}

.toggle-button.is-checked .toggle-button-thumb {
    transform: translateX(14px);
}

.toggle-button:focus-visible {
    outline: 2px solid var(--active-accent);
    outline-offset: 2px;
}
</style>
