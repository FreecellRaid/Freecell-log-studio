<template>
    <MobileMessageList
        v-if="activeChunk"
        :active-chunk="activeChunk"
        :messages="visibleMessages"
        @rename-chunk="startChunkRename"
        @edit-message="startMessageEdit"
        @insert-after="insertAfter"
        @merge-with-next="mergeWithNext"
        @delete-message="deleteMessage"
    />
    <div v-else class="view-empty-hint">
        当前场景已不存在，请从场景列表选择其他场景。
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileMessageList from '@/components/mobile/workspace/MobileMessageList.vue';
import { useLogCommands } from '@/stores/project/logCommands';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useActiveContext } from '@/composables/application/useActiveContext';
import { useStyleStore } from '@/stores/project/styleStore';
import { useUiStore } from '@/stores/ui/uiStore';
import { useLogStore } from '@/stores/project/logStore';
import type { Message } from '@/types/log';

const uiStore = useUiStore();
const styleStore = useStyleStore();
const logCommands = useLogCommands();
const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();

const props = defineProps<{ windowId: string; originalId: string }>();
const logStore = useLogStore();
const activeChunk = computed(() => logStore.findChunkById(props.originalId));
const activeContext = useActiveContext(() => activeChunk.value?.chunkId);

const visibleMessages = computed(() => {
    if (!activeChunk.value) return [];
    if (uiStore.showHidden) return activeChunk.value.messages;

    const { hideOoc, hideCommand } = styleStore.viewSettings;
    return activeChunk.value.messages.filter((message) => {
        return !(
            (hideOoc && message.isOoc) ||
            (hideCommand && message.isCommand)
        );
    });
});

function startMessageEdit(message: Message) {
    editorSessionStore.startEditing({
        kind: 'message',
        chunkId: message.chunkId,
        messageId: message.messageId,
    });
    mobileUiStore.openSheet('message');
}

function insertAfter(message: Message, index: number) {
    if (!activeChunk.value) return;
    logCommands.insertNewMessageAfter(
        activeChunk.value.chunkId,
        message,
        index,
    );
}

function mergeWithNext(messageId: string) {
    if (!activeChunk.value) return;
    logCommands.mergeWithNextMessage(activeChunk.value.chunkId, messageId);
}

function deleteMessage(messageId: string) {
    if (!activeChunk.value) return;
    if (!window.confirm('确定要删除这条消息吗？')) return;
    logCommands.deleteMessage(activeChunk.value.chunkId, messageId);
    if (activeContext.selectedMessageIds.value.has(messageId)) {
        activeContext.clearMessageSelection();
    }
}

function startChunkRename() {
    if (!activeChunk.value) return;
    editorSessionStore.startEditing({
        kind: 'chunkName',
        chunkId: activeChunk.value.chunkId,
    });
    mobileUiStore.openSheet('chunkName');
}
</script>
