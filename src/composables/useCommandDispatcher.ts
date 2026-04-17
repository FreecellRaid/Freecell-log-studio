import { useWindowStore } from '@/stores/windowStore';
import { useFilter } from '@/composables/useFilter';
import { useHistoryStore } from '@/stores/historyStore';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useMessageEditorStore } from '@/stores/editorStore/messageStore';
import { useChunkEditorStore } from '@/stores/editorStore/chunkStore';
import { useLogStore } from '@/stores/logStore';
import { useExportStore } from '@/stores/exportStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useProjectManager } from '@/composables/useProjectManager';
import type { Chunk } from '@/types/log';
import { useSearchStore } from '@/stores/searchStore';

export type CommandType =
    | 'select'
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
    | 'export'
    | 'selectPrevious'
    | 'selectNext'
    | 'toggleOoc'
    | 'toggleCommand'
    | 'merge'
    | 'selectNextSamePlayer'
    | 'jump';

export function useCommandDispatcher() {
    const windowStore = useWindowStore();
    const filter = useFilter();
    const history = useHistoryStore();
    const clipboard = useClipboardStore();
    const messageEditor = useMessageEditorStore();
    const chunkEditor = useChunkEditorStore();
    const logStore = useLogStore();
    const selectionStore = useSelectionStore();
    const projectManager = useProjectManager();
    const exportStore = useExportStore();
    const searchStore = useSearchStore();

    const dispatch = (command: CommandType, payload?: any) => {
        const focus = windowStore.activeFocus;
        const activeWin = windowStore.currentActiveWindow;
        const { windowType, windowName } = activeWin;

        // P0 Modal 开启时拦截其他业务命令
        if (windowType === 'modal') {
            if (command === 'cancel') return windowStore.closeHelpDocument();
            return;
        }

        // P1 全局级命令
        const globalActions: Partial<Record<CommandType, () => void>> = {
            toggleLeft: () => windowStore.toggleLeftSidebar(),
            toggleRight: () => windowStore.toggleRightSidebar(),
            openHelp: () => windowStore.openHelpDocument(),
            undo: () => history.undo(),
            redo: () => history.redo(),
            save: () => projectManager.saveCurrentProjectToLocal(),
            export: () => {
                const formatId = exportStore.activeFormat?.formatId;
                if (formatId) windowStore.openExportPreview(formatId);
            },
        };

        if (globalActions[command]) {
            globalActions[command]!();
            return;
        }

        // P2 基于 windowName 的分发
        switch (windowName) {
            case 'chunkView':
                handleChunkViewCommands(command, focus, payload);
                break;
            case 'chunkList':
                handleChunkListCommands(command);
                break;
            case 'search':
                handleSearchCommands(command, payload);
                break;
        }
    };

    function handleChunkViewCommands(
        cmd: string,
        chunkId: string,
        payload?: any,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        const messages = chunk?.messages || [];
        if (cmd === 'select' && payload) {
            const { event, msgId, messages } = payload;
            filter.handleMessageClickSelection(event, msgId, messages);
            return;
        }
        if (cmd === 'selectAll') {
            filter.selectAllInChunk(chunkId);
        }
        if (cmd === 'cancel') {
            filter.clearMessageSelection();
        }
        if (cmd === 'delete') {
            const selectedIds = filter.selectedMessageIds.value;
            if (selectedIds.size > 0) {
                messageEditor.batchDeleteMessages(selectedIds);
                filter.clearMessageSelection();
            }
        }
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
        if (cmd === 'toggleOoc') {
            const selectedIds = filter.selectedMessageIds.value;
            if (selectedIds.size > 0) messageEditor.toggleOoc(selectedIds);
        }

        if (cmd === 'toggleCommand') {
            const selectedIds = filter.selectedMessageIds.value;
            if (selectedIds.size > 0) messageEditor.toggleCommand(selectedIds);
        }
        if (cmd === 'merge') {
            const selectedIds = filter.selectedMessageIds.value;
            if (selectedIds.size > 1) {
                messageEditor.mergeMessages(
                    chunkId,
                    Array.from(selectedIds),
                    Array.from(selectedIds)[0],
                );
                filter.clearMessageSelection();
            } else {
                messageEditor.mergeWithNextMessage(
                    chunkId,
                    Array.from(selectedIds)[0],
                );
            }
        }
        if (cmd === 'selectNext') {
            selectionStore.selectNext(
                chunkId,
                'message',
                messages,
                (m) => m.messageId,
            );
        }

        if (cmd === 'selectPrevious') {
            selectionStore.selectPrevious(
                chunkId,
                'message',
                messages,
                (m) => m.messageId,
            );
        }
        if (cmd === 'selectNextSamePlayer') {
            selectionStore.selectNextByProperty(
                chunkId,
                'message',
                messages,
                'playerName',
                (m) => m.messageId,
            );
        }
    }

    function handleChunkListCommands(cmd: string) {
        const chunkListFilter = useFilter('chunkList');
        const allChunks = logStore.allChunks;
        if (cmd === 'selectAll') {
            chunkListFilter.selectAllChunks();
        }
        if (cmd === 'cancel') {
            chunkListFilter.clearChunkSelection();
        }
        if (cmd === 'delete') {
            const selectedIds = Array.from(
                chunkListFilter.selectedChunkIds.value,
            );
            if (selectedIds.length > 0) {
                selectedIds.forEach((chunkId) => {
                    chunkEditor.deleteChunk(chunkId);
                });
                chunkListFilter.clearChunkSelection();
            }
        }
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
        if (cmd === 'merge') {
            const selectedIds = Array.from(
                chunkListFilter.selectedChunkIds.value,
            );
            if (selectedIds.length > 1) {
                chunkEditor.mergeChunks(selectedIds);
                chunkListFilter.clearChunkSelection();
                chunkListFilter.setChunkSelection([selectedIds[0]]);
            } else if (selectedIds.length === 1) {
                chunkEditor.mergeWithNextChunk(selectedIds[0]);
            }
        }
        if (cmd === 'selectNext') {
            selectionStore.selectNext(
                'chunkList',
                'chunk',
                allChunks,
                (c) => c.chunkId,
            );
        }
        if (cmd === 'selectPrevious') {
            selectionStore.selectPrevious(
                'chunkList',
                'chunk',
                allChunks,
                (c) => c.chunkId,
            );
        }
    }

    function handleSearchCommands(cmd: CommandType, payload?: any) {
        const searchFilter = useFilter('search');
        if (cmd === 'select') {
            if (payload?.msgId && payload?.messages) {
                searchFilter.handleMessageClickSelection(
                    payload.event,
                    payload.msgId,
                    payload.messages,
                );
            }
        }
        if (cmd === 'selectAll') {
            if (payload?.messages) {
                const ids = payload.messages.map((m: any) => m.messageId);
                searchFilter.setMessagesSelection(ids);
            }
        }
        // 这个等后面改好了 快捷键=>指令 再加上，现在enter有歧义
        if (cmd === 'jump') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            const target =
                searchStore.searchResults.find((msg) =>
                    selectedIds.has(msg.messageId),
                ) || searchStore.searchResults[0];

            if (!target) {
                return;
            }

            const chunkId = target.chunkId;
            selectionStore.select(
                chunkId,
                'message',
                [target.messageId],
                false,
            );
            windowStore.requestMessageReveal(chunkId, target.messageId);

            if (windowStore.isInSplitMode()) {
                const activeViewId = windowStore.currentActiveView.windowId;
                const splitPanes = windowStore.splitPanes;

                if (splitPanes[0]?.windowId === activeViewId) {
                    windowStore.setPaneView(0, 'chunkView', chunkId);
                } else if (splitPanes[1]?.windowId === activeViewId) {
                    windowStore.setPaneView(1, 'chunkView', chunkId);
                } else {
                    windowStore.setPaneView(0, 'chunkView', chunkId);
                }
                return;
            }

            windowStore.setActiveChunk(chunkId);
            return;
        }
        if (cmd === 'cancel') {
            searchFilter.clearMessageSelection();
        }
        if (cmd === 'delete') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            if (selectedIds.size > 0) {
                messageEditor.batchDeleteMessages(selectedIds);
                searchFilter.clearMessageSelection();
            }
        }
        if (cmd === 'copy') {
            if (searchFilter.selectedMessages.value.length > 0) {
                clipboard.copyMessages(searchFilter.selectedMessages.value);
            }
        }
        if (cmd === 'toggleOoc') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            messageEditor.toggleOoc(selectedIds);
            return;
        }

        if (cmd === 'toggleCommand') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            messageEditor.toggleCommand(selectedIds);
            return;
        }
    }

    return { dispatch };
}
