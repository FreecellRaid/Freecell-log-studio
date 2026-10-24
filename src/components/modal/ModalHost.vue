<template>
    <!-- #editor 由 App 在同一轮挂载，延后解析以确保目标已经插入 DOM。 -->
    <Teleport defer to="#editor">
        <ModalFrame
            v-for="(name, index) in editorDialogs.stack"
            :key="name"
            :dialog-name="name"
            :layer="index"
            :is-top="editorDialogs.top === name"
            :labelled-by="
                name === 'help'
                    ? 'help-title'
                    : name === 'imageInsert'
                      ? 'image-insert-title'
                      : name === 'replace'
                        ? 'replace-title'
                        : 'remote-import-title'
            "
        >
            <HelpDocument v-if="name === 'help'" />
            <RemoteImportDialog v-else-if="name === 'remoteImport'" />
            <ImageInsertDialog v-else-if="name === 'imageInsert'" />
            <ReplacementDialog v-else-if="name === 'replace'" />
        </ModalFrame>
    </Teleport>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/stores/ui/dialogStore';

import ModalFrame from '@/components/modal/ModalFrame.vue';
import HelpDocument from '@/components/modal/HelpDocument.vue';
import RemoteImportDialog from '@/components/modal/RemoteImportDialog.vue';
import ImageInsertDialog from '@/components/modal/ImageInsertDialog.vue';
import ReplacementDialog from '@/components/modal/ReplacementDialog.vue';

const editorDialogs = useDialogStore();
</script>
