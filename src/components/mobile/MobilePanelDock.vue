<template>
    <nav class="mobile-panel-dock">
        <button
            v-for="item in bottomPanels"
            :key="item.name"
            type="button"
            :class="{
                'is-active':
                    mobileUiStore.bottomPanelOpen &&
                    windowStore.activeLeftPanelName === item.name,
            }"
            @click="togglePanel(item.name)"
        >
            <component :is="item.icon" class="ui-icon" />
            <span>{{ item.label }}</span>
        </button>
    </nav>
</template>

<script setup lang="ts">
import {
    FolderOpen,
    Palette,
    Search,
    TextInitial,
    UserRound,
} from '@lucide/vue';
import { useMobileUiStore } from '@/stores/mobileUiStore';
import { useWindowStore } from '@/stores/windowStore';
import type { WindowName } from '@/types/window';

const mobileUiStore = useMobileUiStore();
const windowStore = useWindowStore();

const bottomPanels: Array<{
    name: WindowName;
    label: string;
    icon: typeof FolderOpen;
}> = [
    { name: 'chunkList', label: '场景', icon: FolderOpen },
    { name: 'identity', label: '身份', icon: UserRound },
    { name: 'ruleEditor', label: '染色', icon: Palette },
    { name: 'search', label: '搜索', icon: Search },
    { name: 'exportFormat', label: '模板', icon: TextInitial },
];

function togglePanel(panelName: WindowName) {
    const isCurrentOpen =
        mobileUiStore.bottomPanelOpen &&
        windowStore.activeLeftPanelName === panelName;
    if (isCurrentOpen) {
        mobileUiStore.closeOverlay();
        return;
    }
    windowStore.setLeftPanel(panelName, { revealSidebar: false });
    mobileUiStore.openBottomPanel();
}
</script>

<style scoped>
.mobile-panel-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    height: calc(58px + env(safe-area-inset-bottom));
    padding: 0 4px env(safe-area-inset-bottom);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border-top: 1px solid var(--border-color);
    background: var(--bg-topbar);
}

.mobile-panel-dock button {
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 11px;
}

.mobile-panel-dock button.is-active {
    color: var(--active-accent);
}

.mobile-panel-dock .ui-icon {
    width: 20px;
    height: 20px;
}
</style>
