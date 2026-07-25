<template>
    <div
        class="view"
        data-focus-id="defaultView"
        :class="{ 'is-active': windowStore.activeFocus === 'defaultView' }"
        @pointerdown="windowStore.setFocus('defaultView')"
    >
        <header class="view-header">
            <div class="view-title">
                <LayoutDashboard class="ui-icon icon-view-title" />
                <h2 class="text-view-title">工作台</h2>
            </div>
        </header>

        <div class="welcome-container">
            <div class="welcome-content">
                <FolderOpen class="bg-icon" />
                <h2 class="title">导入跑团 Log</h2>
                <p class="subtitle">
                    将文件拖拽至工作台区域，或点击右上角
                    <FolderOpen class="ui-icon" />
                    进行导入
                </p>

                <div class="shortcuts-hint">
                    <div class="shortcut-item">
                        <span>切换侧边栏</span>
                        <span>Ctrl + B</span>
                    </div>
                    <div class="shortcut-item">
                        <span>打开帮助文档</span>
                        <span>Ctrl + K</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { FolderOpen, LayoutDashboard } from '@lucide/vue';
import { useWindowStore } from '@/stores/windowStore';

const windowStore = useWindowStore();
onMounted(() => {
    windowStore.registerWindow({
        windowId: 'defaultView',
        windowName: 'defaultView',
        windowType: 'view',
        originalId: 'defaultView',
    });
});
</script>

<style scoped>
.welcome-container {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
}
.welcome-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 400px;
}

.title {
    font-size: 24px;
    font-weight: 600;
    color: var(--active-accent);
    opacity: 0.8;
}

.subtitle {
    font-size: 14px;
    color: var(--text-muted);
}

.shortcuts-hint {
    margin-top: 4px;
    font-size: 12px;
    min-width: 200px;
    color: var(--text-muted);
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
    padding: 4px 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
}
</style>
