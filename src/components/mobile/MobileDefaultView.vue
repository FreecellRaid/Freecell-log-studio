<template>
    <div class="mobile-empty">
        <MessagesSquare class="mobile-empty-icon" />
        <div class="mobile-empty-hint">
            选择一个场景开始编辑
            <br />
            完整功能建议使用 pc 端～
        </div>
        <button
            class="mobile-primary-button"
            type="button"
            @click="openChunkList"
        >
            打开场景列表
        </button>
    </div>
</template>

<script setup lang="ts">
import { MessagesSquare } from '@lucide/vue';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useWindowStore } from '@/stores/ui/windowStore';

const windowStore = useWindowStore();
const mobileUiStore = useMobileUiStore();

function openChunkList() {
    windowStore.selectLeftPanel('chunkList');
    mobileUiStore.openBottomPanel();
}
</script>

<style scoped>
.mobile-empty {
    min-height: 100%;
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
}

.mobile-empty button {
    color: var(--text-primary);
}

.mobile-empty-icon {
    width: 56px;
    height: 56px;
    color: var(--icon-color);
}

.mobile-empty-hint {
    line-height: 1.6;
    margin-bottom: 12px;
    color: var(--text-secondary);
}
</style>
