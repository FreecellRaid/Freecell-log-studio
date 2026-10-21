import type { ImageAttachment } from '@/types/resource';

// 只依赖附件结构，运行时消息与工程文件 DTO 均可使用。
interface ImageMessage {
    images?: readonly ImageAttachment[];
}
interface ImageDocument {
    chunks: readonly { messages: readonly ImageMessage[] }[];
}

export function* iterateMessageImages<T extends ImageMessage>(messages: Iterable<T>) {
    for (const message of messages)
        for (const attachment of message.images ?? [])
            yield { message, attachment };
}

export function* iterateDocumentImages(documents: Iterable<ImageDocument>) {
    for (const document of documents)
        for (const chunk of document.chunks)
            yield* iterateMessageImages(chunk.messages);
}

export function collectDocumentResourceIds(documents: Iterable<ImageDocument>): Set<string> {
    const ids = new Set<string>();
    for (const { attachment } of iterateDocumentImages(documents)) ids.add(attachment.resourceId);
    return ids;
}
