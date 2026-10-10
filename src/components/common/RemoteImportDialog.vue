<template>
    <div
        v-if="store.visible"
        class="remote-import-backdrop"
        @click.self="store.close()"
    >
        <section
            ref="dialog"
            class="remote-import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remote-import-title"
            @keydown="handleKeydown"
        >
            <h3 id="remote-import-title">从链接导入</h3>
            <form @submit.prevent="store.importLink()">
                <label for="remote-import-link">
                    机器人日志链接或日志下载地址
                </label>
                <input
                    id="remote-import-link"
                    v-model="store.input"
                    type="text"
                    placeholder="粘贴日志链接"
                    :disabled="store.loading"
                    autofocus
                />
                <p v-if="store.loading" role="status">正在加载日志…</p>
                <p v-if="store.error" class="remote-import-error" role="alert">
                    {{ store.error }}
                </p>
                <p v-if="store.message" role="status">{{ store.message }}</p>
                <div class="remote-import-actions">
                    <button type="button" @click="store.close()">
                        {{ store.loading ? '取消加载' : '关闭' }}
                    </button>
                    <button
                        type="submit"
                        :disabled="store.loading || !store.input.trim()"
                    >
                        {{ store.error ? '重试' : '导入' }}
                    </button>
                </div>
            </form>
        </section>
    </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRemoteImportStore } from '@/stores/ui/remoteImportStore';
const store = useRemoteImportStore();
const dialog = ref<HTMLElement | null>(null);
let previousFocus: HTMLElement | null = null;
watch(
    () => store.visible,
    async (visible) => {
        if (visible) {
            previousFocus =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            await nextTick();
            dialog.value?.querySelector<HTMLInputElement>('input')?.focus();
        } else {
            previousFocus?.focus();
        }
    },
);
function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        event.stopPropagation();
        store.close();
        return;
    }
    if (event.key !== 'Tab') return;
    const elements = dialog.value?.querySelectorAll<HTMLElement>(
        'input:not(:disabled), button:not(:disabled)',
    );
    if (!elements?.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
</script>

<style scoped>
.remote-import-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #0008;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}
.remote-import-dialog {
    width: min(480px, 100%);
    max-height: 85dvh;
    overflow: auto;
    background: var(--bg-workspace);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 8px 32px var(--box-shadow);
}
h3 {
    margin: 0 0 16px;
}
label {
    display: block;
    margin-bottom: 8px;
}
input {
    box-sizing: border-box;
    width: 100%;
    padding: 10px;
    background: var(--bg-topbar);
    color: inherit;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font: inherit;
}
input::placeholder {
    color: var(--text-muted);
}
input:focus-visible,
button:focus-visible {
    outline: 2px solid var(--active-accent);
    outline-offset: 2px;
}
p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}
.remote-import-error {
    color: var(--color-warning);
}
.remote-import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}
button {
    padding: 8px 14px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: inherit;
    background: var(--bg-topbar);
    cursor: pointer;
}
button:disabled {
    opacity: 0.5;
    cursor: default;
}
button:hover:not(:disabled) {
    background: var(--hover-bg);
}
</style>
