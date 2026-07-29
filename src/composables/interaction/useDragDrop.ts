import { computed, ref } from 'vue';
import { useLogCommands } from '@/stores/project/logCommands';
import { useActiveContext } from '@/composables/application/useActiveContext';

//消息拖拽逻辑
//变为全局状态，确保跨组件拖拽时状态一致
interface DraggedMessageInfo {
    messageIds: string[];
    sourceChunkId: string;
}
const globalDraggedMessage = ref<DraggedMessageInfo | null>(null);
const globalDraggedChunk = ref<string | null>(null);
const globalDraggedDocument = ref<string | null>(null);

export function useMessageDragDrop() {
    const logEditorStore = useLogCommands();
    const activeContext = useActiveContext();

    function onDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    function onDragStart(event: DragEvent, messageId: string, chunkId: string) {
        let idsToMove = [messageId];
        if (activeContext.selectedMessageIds.value.has(messageId)) {
            idsToMove = Array.from(activeContext.selectedMessageIds.value);
        }

        globalDraggedMessage.value = {
            messageIds: idsToMove,
            sourceChunkId: chunkId,
        };

        if (event.dataTransfer) {
            event.dataTransfer.setData('text/plain', messageId);
        }
    }

    function onDrop(
        event: DragEvent,
        targetChunkId: string,
        targetIndex: number,
    ) {
        event.preventDefault();

        if (!globalDraggedMessage.value) return;

        const { messageIds, sourceChunkId } = globalDraggedMessage.value;

        logEditorStore.moveMessages(
            messageIds,
            sourceChunkId,
            targetChunkId,
            targetIndex,
        );

        globalDraggedMessage.value = null;
    }

    function onDragEnd() {
        globalDraggedMessage.value = null;
    }

    return {
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        isDragging: computed(() => globalDraggedMessage.value !== null),
    };
}

//块拖拽
export function useChunkDragDrop() {
    const logCommands = useLogCommands();

    function onDragStart(event: DragEvent, chunkId: string) {
        globalDraggedChunk.value = chunkId;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', chunkId);
        }
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    function onDrop(
        event: DragEvent,
        targetDocId: string,
        targetIndex: number,
    ) {
        event.preventDefault();
        const chunkId = globalDraggedChunk.value;
        if (!chunkId) return;

        logCommands.moveChunk(chunkId, targetDocId, targetIndex);
        globalDraggedChunk.value = null;
    }

    function onDragEnd() {
        globalDraggedChunk.value = null;
    }

    return {
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        isDragging: computed(() => globalDraggedChunk.value !== null),
    };
}

export function useDocumentDragDrop() {
    const logCommands = useLogCommands();

    function onDragStart(event: DragEvent, docId: string) {
        globalDraggedDocument.value = docId;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', docId);
        }
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    function onDrop(event: DragEvent, targetIndex: number) {
        event.preventDefault();
        const docId = globalDraggedDocument.value;
        if (!docId) return;

        logCommands.moveDocument(docId, targetIndex);
        globalDraggedDocument.value = null;
    }

    function onDragEnd() {
        globalDraggedDocument.value = null;
    }

    return {
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
        isDragging: computed(() => globalDraggedDocument.value !== null),
    };
}
