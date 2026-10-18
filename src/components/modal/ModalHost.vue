<template>
    <Teleport to="body">
        <ModalFrame
            v-for="(win, index) in windowStore.openModals"
            :key="win.windowId"
            :class="{ 'dark-mode': uiStore.isDarkMode }"
            :window-id="win.windowId"
            :layer="index"
            :is-top="windowStore.topModal?.windowId === win.windowId"
            :labelled-by="
                win.windowName === 'help' ? 'help-title' : 'remote-import-title'
            "
        >
            <HelpDocument v-if="win.windowName === 'help'" />
            <RemoteImportDialog v-else-if="win.windowName === 'remoteImport'" />
        </ModalFrame>
    </Teleport>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/ui/windowStore';
import { useUiStore } from '@/stores/ui/uiStore';
import HelpDocument from '@/components/modal/HelpDocument.vue';
import RemoteImportDialog from '@/components/modal/RemoteImportDialog.vue';
import ModalFrame from '@/components/modal/ModalFrame.vue';

const windowStore = useWindowStore();
const uiStore = useUiStore();
</script>
