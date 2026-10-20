<template>
    <Teleport to="#editor">
        <ModalFrame
            v-for="(win, index) in windowStore.openModals"
            :key="win.windowId"
            :window-id="win.windowId"
            :layer="index"
            :is-top="windowStore.topModal?.windowId === win.windowId"
            :labelled-by="
                win.windowName === 'help'
                    ? 'help-title'
                    : win.windowName === 'imageInsert'
                      ? 'image-insert-title'
                      : 'remote-import-title'
            "
        >
            <HelpDocument v-if="win.windowName === 'help'" />
            <RemoteImportDialog v-else-if="win.windowName === 'remoteImport'" />
            <ImageInsertDialog v-else-if="win.windowName === 'imageInsert'" />
        </ModalFrame>
    </Teleport>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/ui/windowStore';
import HelpDocument from '@/components/modal/HelpDocument.vue';
import RemoteImportDialog from '@/components/modal/RemoteImportDialog.vue';
import ModalFrame from '@/components/modal/ModalFrame.vue';
import ImageInsertDialog from '@/components/modal/ImageInsertDialog.vue';

const windowStore = useWindowStore();
</script>
