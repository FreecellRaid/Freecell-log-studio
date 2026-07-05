<template>
    <div class="mobile-editor">
        <HelpDocument v-if="windowStore.isHelpOpen" />

        <input
            :ref="setFileInput"
            type="file"
            accept=".txt,.json,application/json"
            multiple
            hidden
            @change="handleFileChange"
        />
        <MobileTopBar
            :project-name="logStore.projectName"
            :total-messages="logStore.totalMessages"
            @menu="mobileStore.openLeftDrawer"
            @import="triggerImport"
        />

        <main class="mobile-main">
            <div v-if="!activeChunk" class="mobile-empty">
                <MessagesSquare class="mobile-empty-icon" />
                <p>选择一个场景开始编辑</p>
                <button
                    class="mobile-primary-button"
                    type="button"
                    @click="mobileStore.openBottomPanel('chunkList')"
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

        <MobileHistoryFloat />
        <MobilePanelDock />
        <MobileBottomPanelDrawer />
        <MobileLeftDrawer />
        <MobileActiveSheet />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessagesSquare } from '@lucide/vue';
import HelpDocument from '@/components/common/HelpDocument.vue';
import MobileActiveSheet from '@/components/mobile/MobileActiveSheet.vue';
import MobileBottomPanelDrawer from '@/components/mobile/MobileBottomPanelDrawer.vue';
import MobileHistoryFloat from '@/components/mobile/MobileHistoryFloat.vue';
import MobileLeftDrawer from '@/components/mobile/MobileLeftDrawer.vue';
import MobileMessageList from '@/components/mobile/MobileMessageList.vue';
import MobilePanelDock from '@/components/mobile/MobilePanelDock.vue';
import MobileTopBar from '@/components/mobile/MobileTopBar.vue';
import { useFileImportInput } from '@/composables/useImporter';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Chunk, Message } from '@/types/log';

const logStore = useLogStore();
const uiStore = useUiStore();
const styleStore = useStyleStore();
const windowStore = useWindowStore();
const editorStore = useLogEditorStore();
const mobileStore = useMobileEditorStore();

const { setFileInput, triggerImport, handleFileChange } = useFileImportInput();

const activeChunk = computed<Chunk | null>(() => {
    const currentView = windowStore.currentActiveView;
    if (currentView.windowName === 'chunkView') {
        return logStore.findChunkById(currentView.originalId);
    }

    return logStore.allChunks[0] ?? null;
});

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
    mobileStore.setEditingMessage(message);
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
    if (mobileStore.selectedMessageId === messageId) {
        mobileStore.selectMessage(messageId);
    }
}

function startChunkRename() {
    if (!activeChunk.value) return;
    mobileStore.startChunkRename(activeChunk.value);
}
</script>

<style scoped>
.mobile-editor {
    width: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text-primary);
    background: var(--bg-workspace);
}

.mobile-icon-button {
    width: 42px;
    height: 42px;
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mobile-icon-button .ui-icon {
    width: 20px;
    height: 20px;
}

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

.mobile-primary-button {
    min-height: 40px;
    border: 1px solid var(--border-color);
    background: var(--bg-sidebar);
    color: var(--text-primary);
    padding: 0 14px;
    border-radius: 8px;
}

.mobile-primary-button {
    background: var(--active-accent);
    border-color: var(--active-accent);
    color: #ffffff;
}
</style>
