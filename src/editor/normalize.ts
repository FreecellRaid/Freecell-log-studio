import type { Chunk, LogDocument } from '@/types/log';

export function normalizeMessages(chunk: Chunk): void {
    chunk.messages.forEach((message, messageIndex) => {
        message.chunkId = chunk.chunkId;
        message.messageIndex = messageIndex;
    });
}

export function normalizeChunk(
    chunk: Chunk,
    docId: string,
    chunkIndex: number,
): void {
    chunk.docId = docId;
    chunk.chunkIndex = chunkIndex;
    normalizeMessages(chunk);
}

export function normalizeDocument(
    document: LogDocument,
    docIndex: number = document.docIndex,
): void {
    document.docIndex = docIndex;
    document.chunks.forEach((chunk, chunkIndex) => {
        normalizeChunk(chunk, document.docId, chunkIndex);
    });
}

export function normalizeDocuments(documents: LogDocument[]): void {
    documents.forEach((document, docIndex) => {
        normalizeDocument(document, docIndex);
    });
}
