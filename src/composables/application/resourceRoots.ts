import { useLogStore } from '@/stores/project/logStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import { documentResourceIds } from '@/io/storage/resourceCleanup';

export function currentResourceRoots() {
    const roots = new Set(documentResourceIds(useLogStore().documents));
    const history = useHistoryStore();
    for (const snapshot of [...history.undoStack, ...history.redoStack])
        for (const id of documentResourceIds(snapshot.documents)) roots.add(id);
    const clipboard = useClipboardStore();
    for (const message of [
        ...clipboard.copiedMessages,
        ...clipboard.copiedChunks.flatMap((chunk) => chunk.messages),
    ])
        for (const image of message.images ?? []) roots.add(image.resourceId);
    return roots;
}
