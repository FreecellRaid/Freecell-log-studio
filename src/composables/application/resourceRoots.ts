import { useLogStore } from '@/stores/project/logStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import {
    collectDocumentResourceIds,
    iterateMessageImages,
} from '@/editor/resourceReferences';

export function currentResourceRoots() {
    const roots = collectDocumentResourceIds(useLogStore().documents);
    const history = useHistoryStore();
    for (const snapshot of [...history.undoStack, ...history.redoStack])
        for (const id of collectDocumentResourceIds(snapshot.documents))
            roots.add(id);
    const clipboard = useClipboardStore();
    for (const { attachment } of iterateMessageImages([
        ...clipboard.copiedMessages,
        ...clipboard.copiedChunks.flatMap((chunk) => chunk.messages),
    ]))
        roots.add(attachment.resourceId);
    return roots;
}
