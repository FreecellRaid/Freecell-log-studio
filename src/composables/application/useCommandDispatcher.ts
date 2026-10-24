import { useDialogStore } from '@/stores/ui/dialogStore';
import { getVisibleMessages } from '@/editor/messageVisibility';
import { useStyleStore } from '@/stores/project/styleStore';
import { useUiStore } from '@/stores/ui/uiStore';
import { computed } from 'vue';
import { selectionScopeForCommand } from '@/types/commandContext';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useSelectionContext } from '@/composables/application/useSelectionContext';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useLogStore } from '@/stores/project/logStore';
import { useExportStore } from '@/stores/io/exportStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useWorkspaceActions } from '@/composables/application/useWorkspaceActions';
import type { Chunk } from '@/types/log';
import { useResourcePanelStore } from '@/stores/editor/resourcePanelStore';
import { useSearchStore } from '@/stores/editor/searchStore';
import { useReplacementStore } from '@/stores/editor/replacementStore';

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
    | 'openSearch'
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
    | 'jump'
    | 'edit'
    | 'replace';

export function useCommandDispatcher() {
    const navigation = useEditorNavigation();
    const editorDialogs = useDialogStore();
    const commandContext = useCommandContextStore();
    // 命令的选区目标也显式传入，避免再次从窗口焦点历史推断。
    const activeContext = useSelectionContext(
        computed(
            () =>
                selectionScopeForCommand(commandContext.current) ?? {
                    kind: 'none',
                },
        ),
    );
    const history = useHistoryStore();
    const clipboard = useClipboardStore();
    const logCommands = useLogCommands();
    const logStore = useLogStore();
    const selectionStore = useSelectionStore();
    const workspaceActions = useWorkspaceActions();
    const exportStore = useExportStore();
    const searchStore = useSearchStore();

    const dispatch = (command: CommandType, payload?: any) => {
        const context = commandContext.current;
        const commandArea =
            context.area === 'scene'
                ? 'scene'
                : context.area === 'panel'
                  ? context.panel
                  : null;
        const originalId = context.area === 'scene' ? context.chunkId : '';

        // P0 Modal 开启时拦截其他业务命令
        if (editorDialogs.isBlocking) {
            if (command === 'cancel') return editorDialogs.closeTop();
            return;
        }

        if (command === 'replace') {
            if (commandArea !== 'search' && commandArea !== 'scene') return;
            const selected = activeContext.selectedMessageIds.value;
            const candidates =
                commandArea === 'search'
                    ? searchStore.searchResults
                    : getVisibleMessages(
                          logStore.findChunkById(originalId)?.messages ?? [],
                          useStyleStore().viewSettings,
                          useUiStore().showHidden,
                      );
            useReplacementStore().open(
                candidates
                    .filter((message) => selected.has(message.messageId))
                    .map((message) => message.messageId),
                commandArea,
                {
                    content:
                        commandArea === 'search' && !searchStore.contentRegex
                            ? searchStore.quickSearch.trim()
                            : '',
                    note:
                        commandArea === 'search' && !searchStore.noteRegex
                            ? searchStore.filter.note.trim()
                            : '',
                },
            );
            return;
        }

        // P1 全局级命令
        const globalActions: Partial<Record<CommandType, () => void>> = {
            toggleLeft: () => navigation.togglePanel(),
            toggleRight: () => navigation.toggleInspector(),
            openHelp: () => editorDialogs.open('help'),
            openSearch: () => {
                navigation.openPanel('search');
                navigation.activatePanel('search');
                searchStore.focusRequested = true;
            },
            undo: () => history.undo(),
            redo: () => history.redo(),
            save: () => {
                void workspaceActions.saveCurrentProjectWithFeedback();
            },
            export: () => {
                const formatId = exportStore.activeFormat?.formatId;
                if (formatId) navigation.showPreview(formatId);
            },
        };

        if (globalActions[command]) {
            globalActions[command]!();
            return;
        }

        // P2 基于 commandArea 的分发
        switch (commandArea) {
            case 'scene':
                handleChunkViewCommands(command, originalId, payload);
                break;
            case 'chunkList':
                handleChunkListCommands(command);
                break;
            case 'resources': {
                const resources = useResourcePanelStore();
                if (command === 'selectAll') resources.selectAll();
                if (command === 'cancel') resources.clearSelection();
                if (command === 'delete') resources.deleteSelected();
                if (command === 'selectNext') resources.selectAdjacent('next');
                if (command === 'selectPrevious')
                    resources.selectAdjacent('previous');
                break;
            }
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
            activeContext.handleMessageClickSelection(event, msgId, messages);
            return;
        }
        if (cmd === 'selectAll') {
            activeContext.selectAllInChunk(chunkId);
        }
        if (cmd === 'cancel') {
            activeContext.clearMessageSelection();
        }
        if (cmd === 'delete') {
            const selectedIds = activeContext.selectedMessageIds.value;
            if (selectedIds.size > 0) {
                logCommands.batchDeleteMessages(selectedIds);
                activeContext.clearMessageSelection();
            }
        }
        if (cmd === 'copy') {
            const selected = activeContext.selectedMessages.value;
            if (selected.length > 0) clipboard.copyMessages(selected);
        }
        if (cmd === 'paste') {
            if (clipboard.dataType !== 'messages') return;
            const pasteData = clipboard.getPasteMessages();
            if (pasteData.length === 0) return;

            const chunk = logStore.findChunkById(chunkId);
            if (!chunk) return;

            const selectedIds = activeContext.selectedMessageIds.value;
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
            logCommands.insertMessages(chunkId, pasteData, insertIndex);
            activeContext.clearMessageSelection();
            activeContext.setMessagesSelection(
                pasteData.map((m) => m.messageId),
            );
        }
        if (cmd === 'toggleOoc') {
            const selectedIds = activeContext.selectedMessageIds.value;
            if (selectedIds.size > 0) logCommands.toggleOoc(selectedIds);
        }

        if (cmd === 'toggleCommand') {
            const selectedIds = activeContext.selectedMessageIds.value;
            if (selectedIds.size > 0) logCommands.toggleCommand(selectedIds);
        }
        if (cmd === 'merge') {
            const visibleIds = getVisibleMessages(
                messages,
                useStyleStore().viewSettings,
                useUiStore().showHidden,
            ).map((message) => message.messageId);
            const visibleIdSet = new Set(visibleIds);
            const selectedIds = Array.from(
                activeContext.selectedMessageIds.value,
            ).filter((id) => visibleIdSet.has(id));
            if (selectedIds.length > 1) {
                logCommands.mergeMessages(chunkId, selectedIds, selectedIds[0]);
                activeContext.clearMessageSelection();
            } else if (selectedIds.length === 1) {
                logCommands.mergeWithNextMessage(
                    chunkId,
                    selectedIds[0],
                    visibleIds,
                );
            }
        }
        if (cmd === 'selectNext') {
            selectionStore.selectNext(
                { kind: 'scene', chunkId },
                'message',
                messages,
                (m) => m.messageId,
            );
        }

        if (cmd === 'selectPrevious') {
            selectionStore.selectPrevious(
                { kind: 'scene', chunkId },
                'message',
                messages,
                (m) => m.messageId,
            );
        }
        if (cmd === 'selectNextSamePlayer') {
            selectionStore.selectNextByProperty(
                { kind: 'scene', chunkId },
                'message',
                messages,
                'playerName',
                (m) => m.messageId,
            );
        }
    }

    function handleChunkListCommands(cmd: string) {
        const chunkListFilter = useSelectionContext({ kind: 'chunkList' });
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
                    logCommands.deleteChunk(chunkId);
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
                logCommands.insertChunks(targetDocId, pasteChunks, insertIndex);
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
                logCommands.mergeChunks(selectedIds);
                chunkListFilter.clearChunkSelection();
                chunkListFilter.setChunkSelection([selectedIds[0]]);
            } else if (selectedIds.length === 1) {
                logCommands.mergeWithNextChunk(selectedIds[0]);
            }
        }
        if (cmd === 'selectNext') {
            selectionStore.selectNext(
                { kind: 'chunkList' },
                'chunk',
                allChunks,
                (c) => c.chunkId,
            );
        }
        if (cmd === 'selectPrevious') {
            selectionStore.selectPrevious(
                { kind: 'chunkList' },
                'chunk',
                allChunks,
                (c) => c.chunkId,
            );
        }
    }

    function handleSearchCommands(cmd: CommandType, payload?: any) {
        const searchFilter = useSelectionContext({ kind: 'search' });
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
            searchFilter.setMessagesSelection(
                searchStore.searchResults.map((message) => message.messageId),
            );
        }

        if (cmd === 'jump') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            const target = payload?.msgId
                ? searchStore.searchResults.find(
                      (msg) => msg.messageId === payload.msgId,
                  )
                : searchStore.searchResults.find((msg) =>
                      selectedIds.has(msg.messageId),
                  ) || searchStore.searchResults[0];

            if (!target) {
                return;
            }

            const chunkId = target.chunkId;
            selectionStore.select(
                { kind: 'scene', chunkId },
                'message',
                [target.messageId],
                false,
            );

            navigation.showScene(chunkId);
            navigation.requestMessageReveal(chunkId, target.messageId);
            return;
        }
        if (cmd === 'cancel') {
            searchFilter.clearMessageSelection();
        }
        if (cmd === 'delete') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            if (selectedIds.size > 0) {
                logCommands.batchDeleteMessages(selectedIds);
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
            logCommands.toggleOoc(selectedIds);
            return;
        }

        if (cmd === 'toggleCommand') {
            const selectedIds = searchFilter.selectedMessageIds.value;
            logCommands.toggleCommand(selectedIds);
            return;
        }
    }

    return { dispatch };
}
