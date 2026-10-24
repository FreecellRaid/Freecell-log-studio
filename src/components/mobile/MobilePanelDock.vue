<template>
    <nav class="mobile-panel-dock">
        <button
            v-for="item in bottomPanels"
            :key="item.name"
            type="button"
            :class="{
                'is-active':
                    mobileUiStore.bottomPanelOpen &&
                    editorLayout.activePanel === item.name,
            }"
            @click="togglePanel(item.name)"
        >
            <component :is="item.icon" class="ui-icon" />
            <span>{{ item.label }}</span>
        </button>
    </nav>
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/ui/layoutStore';

import { FolderOpen, Images, Palette, Search, TextInitial } from '@lucide/vue';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import type { LeftPanel } from '@/types/editorLayout';

const mobileUiStore = useMobileUiStore();
const navigation = useEditorNavigation();
const editorLayout = useLayoutStore();

const bottomPanels: Array<{
    name: LeftPanel;
    label: string;
    icon: typeof FolderOpen;
}> = [
    { name: 'chunkList', label: '场景', icon: FolderOpen },
    { name: 'coloring', label: '样式', icon: Palette },
    { name: 'search', label: '搜索', icon: Search },
    { name: 'exportFormat', label: '模板', icon: TextInitial },
    { name: 'resources', label: '资源', icon: Images },
];

function togglePanel(panelName: LeftPanel) {
    const isCurrentOpen =
        mobileUiStore.bottomPanelOpen && editorLayout.activePanel === panelName;
    if (isCurrentOpen) {
        mobileUiStore.closeOverlay();
        return;
    }
    navigation.selectPanel(panelName);
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
    grid-template-columns: repeat(5, minmax(0, 1fr));
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
