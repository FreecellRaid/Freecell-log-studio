<template>
    <div
        ref="dialog"
        class="modal-backdrop"
        role="dialog"
        :aria-modal="isTop ? true : undefined"
        :aria-labelledby="labelledBy"
        :aria-hidden="!isTop ? true : undefined"
        :inert="!isTop"
        :data-modal-top="isTop ? '' : undefined"
        :style="{ zIndex: 2000 + layer }"
        tabindex="-1"
        @click.self="close"
        @keydown.capture="handleKeydown"
    >
        <slot />
    </div>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/stores/ui/dialogStore';
import type { DialogName } from '@/types/editorLayout';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
    dialogName: DialogName;
    labelledBy: string;
    isTop: boolean;
    layer: number;
}>();
const editorDialogs = useDialogStore();
const dialog = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;

const focusableSelector =
    'input:not(:disabled), button:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

function focusDialog() {
    const target =
        dialog.value?.querySelector<HTMLElement>(
            '[data-autofocus]:not(:disabled)',
        ) ??
        dialog.value?.querySelector<HTMLElement>(focusableSelector) ??
        dialog.value;
    target?.focus();
}

function containFocus(event: FocusEvent) {
    if (
        props.isTop &&
        event.target instanceof Node &&
        !dialog.value?.contains(event.target)
    ) {
        focusDialog();
    }
}

function close() {
    if (props.isTop) editorDialogs.close(props.dialogName);
}

function handleKeydown(event: KeyboardEvent) {
    if (!props.isTop) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
    }
    if (event.key !== 'Tab') return;
    const elements = Array.from(
        dialog.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) {
        event.preventDefault();
        dialog.value?.focus();
    } else if (
        event.shiftKey &&
        (document.activeElement === first ||
            document.activeElement === dialog.value)
    ) {
        event.preventDefault();
        last.focus();
    } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
            document.activeElement === dialog.value)
    ) {
        event.preventDefault();
        first.focus();
    }
}

onMounted(() => {
    previousFocus =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    document.addEventListener('focusin', containFocus);
    if (props.isTop) focusDialog();
});

watch(
    () => props.isTop,
    async (isTop) => {
        if (!isTop) return;
        await nextTick();
        if (props.isTop) focusDialog();
    },
);

onUnmounted(() => {
    document.removeEventListener('focusin', containFocus);
    void nextTick(() => {
        const top = document.querySelector<HTMLElement>('[data-modal-top]');
        // 关闭非顶层窗口时不打断当前 modal 的输入。
        if (top?.contains(document.activeElement)) return;
        if (
            previousFocus?.isConnected &&
            !previousFocus.closest('[inert]') &&
            (!top || top.contains(previousFocus))
        ) {
            previousFocus.focus();
        } else if (top) {
            (top.querySelector<HTMLElement>(focusableSelector) ?? top).focus();
        }
    });
});
</script>

<style scoped>
.modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: var(--box-shadow);
    outline: none;
}
</style>
