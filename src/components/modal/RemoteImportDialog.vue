<template>
    <ModalDialog
        title="从链接导入"
        title-id="remote-import-title"
        @close="store.close()"
    >
        <template #icon><Link class="ui-icon" /></template>
        <form @submit.prevent="store.importLink()">
            <label for="remote-import-link">机器人日志链接或日志下载地址</label>
            <input
                id="remote-import-link"
                v-model="store.input"
                type="text"
                placeholder="粘贴日志链接"
                :disabled="store.loading"
                data-autofocus
            />
            <p v-if="store.loading" role="status">正在加载……</p>
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
    </ModalDialog>
</template>

<script setup lang="ts">
import { Link } from '@lucide/vue';
import ModalDialog from '@/components/modal/ModalDialog.vue';
import { useRemoteImportStore } from '@/stores/ui/remoteImportStore';
const store = useRemoteImportStore();
</script>

<style scoped>
label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
}

input {
    width: 100%;
    box-sizing: border-box;
    background-color: var(--bg-sidebar);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

input::placeholder {
    color: var(--text-muted);
}

input:focus-visible,
button:focus-visible {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}

p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 13px;
    color: var(--text-muted);
}

.remote-import-error {
    color: var(--color-warning);
}

.remote-import-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
}

button {
    padding: 6px 12px;
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
