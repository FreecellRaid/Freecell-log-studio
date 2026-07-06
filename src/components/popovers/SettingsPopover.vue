<template>
    <div class="popover">
        <div class="popover-header">偏好设置</div>

        <div class="settings-section">
            <ToggleButton
                v-model="styleStore.viewSettings.hideOoc"
                class="setting-item"
            >
                隐藏 OOC 消息
            </ToggleButton>
            <ToggleButton
                v-model="styleStore.viewSettings.hideCommand"
                class="setting-item"
            >
                隐藏指令消息
            </ToggleButton>
            <ToggleButton v-model="uiStore.showHidden" class="setting-item">
                显示已隐藏消息
            </ToggleButton>
            <ToggleButton v-model="uiStore.showTime" class="setting-item">
                显示消息时间
            </ToggleButton>
            <ToggleButton v-model="uiStore.showAccount" class="setting-item">
                显示帐号
            </ToggleButton>
            <ToggleButton
                v-model="styleStore.viewSettings.colorMode"
                class="setting-item"
                value="playerName"
            >
                按角色名染色
            </ToggleButton>
            <ToggleButton
                v-model="styleStore.viewSettings.colorMode"
                class="setting-item"
                value="account"
            >
                按账号染色
            </ToggleButton>
            <ToggleButton
                class="setting-item"
                :model-value="uiStore.followSystem"
                @update:model-value="uiStore.setFollowSystem(Boolean($event))"
            >
                深色模式跟随系统
            </ToggleButton>
            <ToggleButton
                v-model="uiStore.exportPreviewAlwaysWhite"
                class="setting-item"
            >
                预览始终白色背景
            </ToggleButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import ToggleButton from '@/components/common/ToggleButton.vue';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';

const uiStore = useUiStore();
const styleStore = useStyleStore();
</script>

<style scoped>
.popover {
    width: 180px;
    padding: 12px;
    box-shadow: 5px -3px 12px var(--box-shadow);
}

.popover-header {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
}

.settings-section {
    margin-bottom: 12px;
}

.setting-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    font-size: 13px;
}

.setting-item:hover {
    color: var(--active-accent);
}
</style>
