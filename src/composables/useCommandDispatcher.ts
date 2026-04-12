import { useUiStore } from '@/stores/uiStore';
import { useFilter } from '@/composables/useFilter';
import { useHistoryStore } from '@/stores/historyStore';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import { useChunkEditorStore } from '@/stores/editorStore/chunkStore';
import { useLogStore } from '@/stores/logStore';
import { useExportStore } from '@/stores/exportStore';
import { useProjectManager } from '@/composables/useProjectManager';
import type { Chunk } from '@/types/log';

export type CommandType =
    | 'selectAll'
    | 'cancel'
    | 'copy'
    | 'paste'
    | 'delete'
    | 'toggleLeft'
    | 'toggleRight'
    | 'openHelp'
    | 'undo'
    | 'redo'
    | 'save'
    | 'import'
    | 'export';

export function useCommandDispatcher() {
    const uiStore = useUiStore();
    const filter = useFilter();
    const history = useHistoryStore();
    const clipboard = useClipboardStore();
    const messageEditor = useMessageEditorStore();
    const chunkEditor = useChunkEditorStore();
    const logStore = useLogStore();
    const projectManager = useProjectManager();
    const exportStore = useExportStore();

    const dispatch = (command: CommandType) => {
        const focus = uiStore.activeFocus;
        const viewName = uiStore.currentActiveView.windowName;

        // P0 Modal 开启时拦截其他业务命令
        if (focus.type === 'modal') {
            if (command === 'cancel') return uiStore.closeHelpDocument();
            return;
        }

        // P1 全局级命令
        const globalActions: Partial<Record<CommandType, () => void>> = {
            toggleLeft: () => uiStore.toggleLeftSidebar(),
            toggleRight: () => uiStore.toggleRightSidebar(),
            openHelp: () => uiStore.openHelpDocument(),
            undo: () => history.undo(),
            redo: () => history.redo(),
            save: () => {
                projectManager.saveCurrentProjectToLocal();
            },
            export: () => {
                const formatId = exportStore.activeFormat?.formatId;
                if (formatId) {
                    uiStore.toggleExportPreview(formatId);
                }
            },
        };

        if (globalActions[command]) {
            globalActions[command]!();
            return;
        }

        // P2 基于 windowName 的分发
        switch (viewName) {
            case 'chunkView':
                handleChunkViewCommands(command, focus.id);
                break;
            case 'chunkList':
                handleChunkListCommands(command);
                break;
            case 'search':
                handleSearchCommands(command);
                break;
        }
    };

    function handleChunkViewCommands(cmd: string, chunkId: string) {
        if (cmd === 'selectAll') filter.selectAllInChunk(chunkId);
        if (cmd === 'cancel') filter.clearMessageSelection();
        if (cmd === 'copy') {
            const selected = filter.selectedMessages.value;
            if (selected.length > 0) clipboard.copyMessages(selected);
        }

        if (cmd === 'paste') {
            if (clipboard.dataType !== 'messages') return;
            const pasteData = clipboard.getPasteMessages();
            if (pasteData.length === 0) return;

            const chunk = logStore.findChunkById(chunkId);
            if (!chunk) return;

            const selectedIds = filter.selectedMessageIds.value;
            let insertIndex = chunk.messages.length;

            if (selectedIds.size > 0) {
                let maxIdxInChunk = -1;
                chunk.messages.forEach((m, idx) => {
                    if (selectedIds.has(m.messageId)) {
                        maxIdxInChunk = idx;
                    }
                });
                if (maxIdxInChunk !== -1) {
                    insertIndex = maxIdxInChunk + 1;
                }
            }

            messageEditor.insertMessages(chunkId, pasteData, insertIndex);
            filter.clearMessageSelection();
            filter.setMessagesSelection(pasteData.map((m) => m.messageId));
        }
    }

    function handleChunkListCommands(cmd: string) {
        const chunkListFilter = useFilter('chunkList');

        if (cmd === 'selectAll') chunkListFilter.selectAllChunks();
        if (cmd === 'cancel') chunkListFilter.clearChunkSelection();
        if (cmd === 'copy') {
            const selectedIds = Array.from(
                chunkListFilter.selectedChunkIds.value,
            );
            if (selectedIds.length > 0) {
                const chunks = selectedIds
                    .map((id) => logStore.findChunkById(id))
                    .filter((c): c is Chunk => !!c);
                clipboard.copyChunks(chunks);
            }
        }

        if (cmd === 'paste') {
            if (clipboard.dataType !== 'chunks') return;
            const pasteChunks = clipboard.getPasteChunks();
            if (pasteChunks.length === 0) return;

            let targetDocId = '';
            let insertIndex = 0;

            const selectedIds = chunkListFilter.selectedChunkIds.value;

            if (selectedIds.size > 0) {
                let foundMaxIdx = -1;
                for (const doc of logStore.documents) {
                    doc.chunks.forEach((c, idx) => {
                        if (selectedIds.has(c.chunkId)) {
                            targetDocId = doc.docId;
                            foundMaxIdx = idx;
                        }
                    });
                }
                if (targetDocId) {
                    insertIndex = foundMaxIdx + 1;
                }
            }

            if (!targetDocId) {
                const docs = logStore.documents;
                if (docs.length > 0) {
                    const lastDoc = docs[docs.length - 1];
                    targetDocId = lastDoc.docId;
                    insertIndex = lastDoc.chunks.length;
                }
            }

            if (targetDocId) {
                chunkEditor.insertChunks(targetDocId, pasteChunks, insertIndex);
                chunkListFilter.setChunkSelection(
                    pasteChunks.map((c) => c.chunkId),
                );
            }
        }
    }

    function handleSearchCommands(cmd: CommandType) {
        const searchFilter = useFilter('search');
        if (cmd === 'cancel') searchFilter.clearMessageSelection();
        if (cmd === 'copy') {
            if (searchFilter.selectedMessages.value.length > 0) {
                clipboard.copyMessages(searchFilter.selectedMessages.value);
            }
        }
    }

    return { dispatch };
}
