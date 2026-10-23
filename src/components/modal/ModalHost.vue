<template>
    <!-- #editor 由 App 在同一轮挂载，延后解析以确保目标已经插入 DOM。 -->
    <Teleport defer to="#editor">
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
                      : win.windowName === 'replace'
                        ? 'replace-title'
                        : 'remote-import-title'
            "
        >
            <HelpDocument v-if="win.windowName === 'help'" />
            <RemoteImportDialog v-else-if="win.windowName === 'remoteImport'" />
            <ImageInsertDialog v-else-if="win.windowName === 'imageInsert'" />
            <ReplacementDialog v-else-if="win.windowName === 'replace'" />
        </ModalFrame>
    </Teleport>
</template>

<script setup lang="ts">
import { useWindowStore } from '@/stores/ui/windowStore';
import ModalFrame from '@/components/modal/ModalFrame.vue';
import HelpDocument from '@/components/modal/HelpDocument.vue';
import RemoteImportDialog from '@/components/modal/RemoteImportDialog.vue';
import ImageInsertDialog from '@/components/modal/ImageInsertDialog.vue';
import ReplacementDialog from '@/components/modal/ReplacementDialog.vue';

const windowStore = useWindowStore();
</script>
