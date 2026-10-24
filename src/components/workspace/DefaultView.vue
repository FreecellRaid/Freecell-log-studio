<template>
    <div
        class="view"
        :class="{ 'is-active': navigation.isCommandTarget(paneId) }"
        data-focus-id="defaultView"
        v-command-scope="{ area: 'empty', paneId }"
    >
        <header v-if="!isMobile" class="view-header">
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
                    <template v-if="!isMobile">
                        将文件拖拽至工作台区域，或
                    </template>
                    点击右上角
                    <Upload class="ui-icon" />
                    进行导入
                    <br />
                    <br />
                    点击左下角打开场景列表
                </p>

                <div class="shortcuts-hint" v-if="!isMobile">
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
import { vCommandScope } from '@/directives/commandScope';
import { FolderOpen, LayoutDashboard, Upload } from '@lucide/vue';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode';

defineProps<{ paneId: string }>();
const { isMobile } = useResponsiveMode();
const navigation = useEditorNavigation();
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
