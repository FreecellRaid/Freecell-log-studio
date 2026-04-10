<template>
    <div class="ide-container">
        <TopMenuBar />

        <main class="middle-section">
            <aside class="sidebar-left">
                <SidebarLeft />
            </aside>

            <section class="workspace">
                <MainWorkspace />
            </section>

            <aside v-if="uiStore.rightVisible" class="sidebar-right">
                <SidebarRight />
            </aside>
        </main>

        <footer class="status-bar">
            <StatusBar />
        </footer>

        <HelpDocument
            v-if="uiStore.helpDocumentVisible"
            @close="uiStore.closeHelpDocument"
        />
    </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore';
import { useLogStore } from '@/stores/logStore';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useFilter } from '@/composables/useFilter';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import TopMenuBar from '@/components/layout/TopMenuBar.vue';
import SidebarLeft from '@/components/layout/SidebarLeft.vue';
import MainWorkspace from '@/components/workspace/MainWorkspace.vue';
import StatusBar from '@/components/layout/StatusBar.vue';
import SidebarRight from '@/components/layout/SidebarRight.vue';
import HelpDocument from '@/components/common/HelpDocument.vue';
import { useProjectManager } from '@/composables/useProjectManager';

const uiStore = useUiStore();
const logStore = useLogStore();
const filterTool = useFilter();
const clipboardStore = useClipboardStore();
const messageEditorStore = useMessageEditorStore();
const historyStore = useHistoryStore();
const projectManager = useProjectManager();

function handleSelectAll() {
    const activeChunkId = uiStore.activeChunkId;
    if (activeChunkId) {
        filterTool.selectAllInChunk(activeChunkId);
    }
}

function handleClearSelection() {
    filterTool.clearSelection();
}

function handleCopy() {
    const activeChunkId = uiStore.activeChunkId;
    if (!activeChunkId) return;
    const chunk = logStore.findChunkById(activeChunkId);
    if (!chunk) return;

    const selected = chunk.messages.filter((m) =>
        filterTool.selectedMessageIds.value.has(m.messageId),
    );
    if (selected.length > 0) {
        clipboardStore.copy(selected);
    }
}

function handlePaste() {
    const activeChunkId = uiStore.activeChunkId;
    if (!activeChunkId) return;
    const chunk = logStore.findChunkById(activeChunkId);
    if (!chunk) return;

    const pasteItems = clipboardStore.getPasteData();
    if (!pasteItems.length) return;

    const selectedIndices = chunk.messages
        .map((m, i) =>
            filterTool.selectedMessageIds.value.has(m.messageId) ? i : -1,
        )
        .filter((i) => i !== -1);

    const insertIndex =
        selectedIndices.length > 0
            ? Math.max(...selectedIndices) + 1
            : chunk.messages.length;

    messageEditorStore.insertMessages(activeChunkId, pasteItems, insertIndex);

    filterTool.clearSelection();
    pasteItems.forEach((m) =>
        filterTool.selectedMessageIds.value.add(m.messageId),
    );
    filterTool.lastSelectedMessageId.value =
        pasteItems[pasteItems.length - 1].messageId;
}

function handleUndo() {
    historyStore.undo();
}

function handleRedo() {
    historyStore.redo();
}

function handleSave() {
    if (logStore.documents.length === 0) {
        return;
    }

    const result = projectManager.saveCurrentProjectToLocal();
    if (!result.success) {
        alert('本地存储空间不足，保存失败。');
    }
}

function handleToggleExportPreview() {
    if (logStore.documents.length === 0) {
        return;
    }

    uiStore.toggleExportPreview();
}

useKeyboardShortcuts({
    selectAll: handleSelectAll,
    clearSelection: handleClearSelection,
    copy: handleCopy,
    paste: handlePaste,
    undo: handleUndo,
    redo: handleRedo,
    save: handleSave,
    toggleExportPreview: handleToggleExportPreview,
    toggleHelp: uiStore.toggleHelpDocument,
    closeHelp: uiStore.closeHelpDocument,
});
</script>

<style scoped>
.ide-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
}
</style>
