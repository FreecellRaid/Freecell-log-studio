<template>
    <div class="popover">
        <div class="popover-header">偏好设置</div>

        <div class="settings-section">
            <label class="setting-item">
                <input
                    type="checkbox"
                    :checked="uiStore.followSystem"
                    @change="
                        uiStore.setFollowSystem(
                            ($event.target as HTMLInputElement).checked,
                        )
                    "
                />
                <span>深色模式跟随系统</span>
            </label>
            <label class="setting-item">
                <input
                    type="checkbox"
                    v-model="uiStore.exportPreviewAlwaysWhite"
                />
                <span>预览始终白色背景</span>
            </label>
            <label class="setting-item">
                <input type="checkbox" v-model="uiStore.showTime" />
                <span>显示消息时间</span>
            </label>
            <label class="setting-item">
                <input type="checkbox" v-model="uiStore.showAccount" />
                <span>显示帐号</span>
            </label>
            <label class="setting-item">
                <input
                    type="checkbox"
                    v-model="styleStore.viewSettings.hideOoc"
                />
                <span>隐藏 OOC 消息</span>
            </label>
            <label class="setting-item">
                <input
                    type="checkbox"
                    v-model="styleStore.viewSettings.hideCommand"
                />
                <span>隐藏指令消息</span>
            </label>
            <label
                class="setting-item"
                title="开启后，被隐藏的消息将以 0.5 透明度显示而非完全消失"
            >
                <input type="checkbox" v-model="uiStore.showHidden" />
                <span>显示已隐藏消息</span>
            </label>
            <label class="setting-item">
                <input
                    type="radio"
                    value="playerName"
                    v-model="styleStore.viewSettings.colorMode"
                />
                <span>按角色名染色</span>
            </label>
            <label class="setting-item">
                <input
                    type="radio"
                    value="account"
                    v-model="styleStore.viewSettings.colorMode"
                />
                <span>按账号染色</span>
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';

const uiStore = useUiStore();
const styleStore = useStyleStore();
</script>

<style scoped>
.popover {
    width: 200px;
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
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
}

.setting-item:hover {
    color: var(--active-accent);
}

.setting-item input[type='checkbox'],
.setting-item input[type='radio'] {
    cursor: pointer;
}
</style>
