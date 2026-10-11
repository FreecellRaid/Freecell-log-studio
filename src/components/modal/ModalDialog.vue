<template>
    <section class="modal-dialog">
        <header class="modal-header">
            <div class="header-title">
                <slot name="icon" />
                <h2 :id="titleId">{{ title }}</h2>
            </div>
            <button
                class="close-button icon-interactive"
                type="button"
                :title="closeTitle"
                :aria-label="closeTitle"
                @click="$emit('close')"
            >
                <X class="ui-icon" />
            </button>
        </header>
        <div class="modal-content">
            <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
        </footer>
    </section>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue';

withDefaults(
    defineProps<{
        title: string;
        titleId: string;
        closeTitle?: string;
    }>(),
    { closeTitle: '关闭' },
);
defineEmits<{ close: [] }>();
</script>

<style scoped>
.modal-dialog {
    width: min(480px, calc(100vw - 32px));
    max-height: min(80vh, 520px);
    display: flex;
    flex-direction: column;
    background: var(--bg-topbar);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px var(--box-shadow);
}
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.modal-header .header-title {
    margin-top: 0;
}
.modal-header h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
}
.close-button {
    background: none;
    border: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.close-button:hover {
    background: var(--hover-bg);
}
.close-button .ui-icon {
    width: 16px;
    height: 16px;
}
.modal-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 20px;
    font-size: 13px;
    line-height: 1.6;
}
.modal-footer {
    display: flex;
    padding: 8px 20px;
    font-size: 12px;
    color: var(--text-muted);
    flex-shrink: 0;
}
</style>
