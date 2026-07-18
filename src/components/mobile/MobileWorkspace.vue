<template>
    <main class="mobile-main">
        <div v-if="!activeChunk" class="mobile-empty">
            <MessagesSquare class="mobile-empty-icon" />
            <p>选择一个场景开始编辑</p>
            <button
                class="mobile-primary-button"
                type="button"
                @click="openChunkList"
            >
                打开场景列表
            </button>
        </div>

        <MobileMessageList
            v-else
            :active-chunk="activeChunk"
            :messages="visibleMessages"
            @rename-chunk="startChunkRename"
            @edit-message="startMessageEdit"
            @insert-after="insertAfter"
            @merge-with-next="mergeWithNext"
            @delete-message="deleteMessage"
        />
    </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessagesSquare } from '@lucide/vue';
import MobileMessageList from '@/components/mobile/MobileMessageList.vue';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useMobileUiStore } from '@/stores/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editorSessionStore';
import { useActiveContext } from '@/composables/useActiveContext';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Chunk, Message } from '@/types/log';

const logStore = useLogStore();
const uiStore = useUiStore();
const styleStore = useStyleStore();
const windowStore = useWindowStore();
const editorStore = useLogEditorStore();
const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();

const activeChunk = computed<Chunk | null>(() => {
    const currentView = windowStore.currentActiveView;
    if (currentView.windowName === 'chunkView') {
        return logStore.findChunkById(currentView.originalId);
    }

    return logStore.allChunks[0] ?? null;
});
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
    editorStore.insertNewMessageAfter(
        activeChunk.value.chunkId,
        message,
        index,
    );
}

function mergeWithNext(messageId: string) {
    if (!activeChunk.value) return;
    editorStore.mergeWithNextMessage(activeChunk.value.chunkId, messageId);
}

function deleteMessage(messageId: string) {
    if (!activeChunk.value) return;
    if (!window.confirm('确定要删除这条消息吗？')) return;
    editorStore.deleteMessage(activeChunk.value.chunkId, messageId);
    if (activeContext.selectedMessageIds.value.has(messageId)) {
        activeContext.clearMessageSelection();
    }
}

function openChunkList() {
    windowStore.setLeftPanel('chunkList', { revealSidebar: false });
    mobileUiStore.openBottomPanel();
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

<style scoped>
.mobile-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(58px + env(safe-area-inset-bottom));
}

.mobile-empty {
    min-height: 100%;
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
    color: var(--text-secondary);
}

.mobile-empty-icon {
    width: 56px;
    height: 56px;
    color: var(--icon-color);
}
</style>
