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
                <div class="subtitle">
                    <div v-if="!isMobile">
                        将文件拖拽至工作台区域，或点击
                        <Upload class="ui-icon" />
                        进行导入
                    </div>
                    <div v-if="isMobile">
                        点击
                        <Upload class="ui-icon" />
                        进行导入
                    </div>
                    <div>点击左上角查看帮助文档</div>
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
    margin-bottom: 10px;
}

.subtitle {
    font-size: 14px;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
