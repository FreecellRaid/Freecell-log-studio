<template>
    <div
        v-if="historyStore.canUndo || historyStore.canRedo"
        class="mobile-history-float"
        aria-label="历史操作"
    >
        <button
            type="button"
            title="撤销"
            :disabled="!historyStore.canUndo"
            @click="historyStore.undo"
        >
            <Undo2 class="ui-icon" />
        </button>
        <button
            type="button"
            title="重做"
            :disabled="!historyStore.canRedo"
            @click="historyStore.redo"
        >
            <Redo2 class="ui-icon" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { Redo2, Undo2 } from '@lucide/vue';
import { useHistoryStore } from '@/stores/historyStore';

const historyStore = useHistoryStore();
</script>

<style scoped>
.mobile-history-float {
    position: fixed;
    left: 40%;
    bottom: calc(80px + env(safe-area-inset-bottom));
    z-index: 40;
    display: inline-flex;
    align-items: center;
    overflow: hidden;
    border-radius: 40px;
    background: var(--bg-topbar);
    box-shadow: 0 4px 16px var(--box-shadow);
}

.mobile-history-float button {
    width: 42px;
    height: 38px;
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.mobile-history-float button:last-child {
    border-right: 0;
}

.mobile-history-float button:hover:not(:disabled),
.mobile-history-float button:focus-visible:not(:disabled) {
    color: var(--icon-color-strong);
    background: var(--hover-bg);
}

.mobile-history-float button:disabled {
    opacity: 0.38;
}

.mobile-history-float .ui-icon {
    width: 18px;
    height: 18px;
}
</style>
