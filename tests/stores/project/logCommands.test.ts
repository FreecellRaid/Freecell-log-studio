import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { Chunk, LogDocument, Message } from '@/types/log';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';

function message(id: string, playerName = `player-${id}`): Message {
    return {
        messageId: id,
        chunkId: 'stale',
        messageIndex: 99,
        playerName,
        account: `account-${id}`,
        time: new Date('2026-01-01T00:00:00Z'),
        content: id,
        isOoc: false,
        isCommand: false,
        role: 'pl',
        note: '',
    };
}

function chunk(id: string, messages: Message[]): Chunk {
    return {
        chunkId: id,
        docId: 'stale',
        chunkName: id,
        chunkIndex: 99,
        messages,
    };
}

function document(id: string, chunks: Chunk[]): LogDocument {
    return {
        docId: id,
        docName: id,
        docIndex: 99,
        chunks,
    };
}

describe('project log commands', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('normalizes the complete hierarchy after structural edits', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a'), message('b')])]),
            document('doc-b', [chunk('chunk-b', [message('c')])]),
        ]);

        expect(commands.moveMessages(['b'], 'chunk-a', 'chunk-b', 0)).toBe(
            true,
        );

        log.documents.forEach((doc, docIndex) => {
            expect(doc.docIndex).toBe(docIndex);
            doc.chunks.forEach((item, chunkIndex) => {
                expect(item.docId).toBe(doc.docId);
                expect(item.chunkIndex).toBe(chunkIndex);
                item.messages.forEach((itemMessage, messageIndex) => {
                    expect(itemMessage.chunkId).toBe(item.chunkId);
                    expect(itemMessage.messageIndex).toBe(messageIndex);
                });
            });
        });
        expect(
            log
                .findChunkById('chunk-b')
                ?.messages.map((item) => item.messageId),
        ).toEqual(['b', 'c']);
    });

    it('captures exactly once for a change and not for a no-op', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a')])]),
        ]);

        expect(commands.updateMessage('chunk-a', 'a', { content: 'a' })).toBe(
            false,
        );
        expect(history.undoStack).toHaveLength(0);

        expect(
            commands.updateMessage('chunk-a', 'a', { content: 'changed' }),
        ).toBe(true);
        expect(history.undoStack).toHaveLength(1);

        history.undo();
        expect(log.messagesById.get('a')?.content).toBe('a');
        history.redo();
        expect(log.messagesById.get('a')?.content).toBe('changed');
    });

    it('renames and merges an identity as one undoable transaction', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        const style = useStyleStore();
        const source = message('a', 'Alice');
        const target = message('b', 'Bob');
        target.role = 'gm';
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [source, target])]),
        ]);
        style.syncSystemRulesFromMessages(log.allMessages);

        expect(commands.renameIdentity('playerName', 'Alice', 'Bob')).toBe(
            true,
        );
        expect(history.undoStack).toHaveLength(1);
        expect(log.allMessages.map((item) => item.playerName)).toEqual([
            'Bob',
            'Bob',
        ]);
        expect(log.allMessages.map((item) => item.role)).toEqual(['gm', 'gm']);
        expect(
            style.systemRules.filter(
                (rule) => rule.filter.playerName === 'Bob',
            ),
        ).toHaveLength(1);

        history.undo();
        expect(log.allMessages.map((item) => item.playerName)).toEqual([
            'Alice',
            'Bob',
        ]);
        expect(
            style.systemRules.some(
                (rule) => rule.filter.playerName === 'Alice',
            ),
        ).toBe(true);
    });

    it('moves, splits, and merges chunks while preserving indexes', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        log.replaceDocuments([
            document('doc-a', [
                chunk('chunk-a', [message('a'), message('b')]),
                chunk('chunk-b', [message('c')]),
            ]),
            document('doc-b', []),
        ]);

        expect(commands.splitChunk('chunk-a', 'b')).toBe(true);
        const splitChunk = log.documents[0].chunks[1];
        expect(splitChunk.messages.map((item) => item.messageId)).toEqual([
            'b',
        ]);
        expect(commands.mergeChunks(['chunk-a', splitChunk.chunkId])).toBe(
            true,
        );
        expect(
            log
                .findChunkById('chunk-a')
                ?.messages.map((item) => item.messageId),
        ).toEqual(['a', 'b']);
        expect(commands.moveChunk('chunk-b', 'doc-b', 0)).toBe(true);
        expect(log.documents[1].chunks[0].docId).toBe('doc-b');
        expect(log.documents[1].chunks[0].chunkIndex).toBe(0);
    });

    it('deletes a document with project and rule synchronization', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        const style = useStyleStore();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a', 'Alice')])]),
            document('doc-b', [chunk('chunk-b', [message('b', 'Bob')])]),
        ]);
        style.syncSystemRulesFromMessages(log.allMessages);

        expect(commands.deleteDocument('doc-a')).toBe(true);
        expect(history.undoStack).toHaveLength(1);
        expect(log.documents.map((doc) => doc.docId)).toEqual(['doc-b']);
        expect(
            style.systemRules.some(
                (rule) => rule.filter.playerName === 'Alice',
            ),
        ).toBe(false);
        expect(log.isImported).toBe(true);
        expect(commands.deleteDocument('doc-b')).toBe(true);
        expect(log.isImported).toBe(false);
        expect(commands.deleteDocument('missing')).toBe(false);
    });

    it('creates documents and chunks as undoable edits', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();

        const docId = commands.createDocument();
        expect(log.documents).toHaveLength(1);
        expect(log.documents[0]).toMatchObject({
            docId,
            docName: '未命名文档',
            docIndex: 0,
            isExpanded: true,
        });
        const defaultChunkId = log.documents[0].chunks[0].chunkId;
        expect(log.documents[0].chunks[0]).toMatchObject({
            docId,
            chunkName: '未命名场景',
            chunkIndex: 0,
            messages: [],
        });

        const chunkId = commands.createChunk(docId);
        expect(log.documents[0].chunks[1]).toMatchObject({
            chunkId,
            docId,
            chunkName: '未命名场景',
            chunkIndex: 1,
            messages: [],
        });
        expect(history.undoStack).toHaveLength(2);

        const firstChunkId = commands.createChunk(docId, '插入的场景', 0);
        expect(log.documents[0].chunks.map((chunk) => chunk.chunkId)).toEqual([
            firstChunkId,
            defaultChunkId,
            chunkId,
        ]);
        expect(
            log.documents[0].chunks.map((chunk) => chunk.chunkIndex),
        ).toEqual([0, 1, 2]);

        history.undo();
        expect(log.documents[0].chunks.map((chunk) => chunk.chunkId)).toEqual([
            defaultChunkId,
            chunkId,
        ]);
        history.undo();
        expect(log.documents[0].chunks).toHaveLength(1);
        history.undo();
        expect(log.documents).toHaveLength(0);
    });

    it('moves documents and normalizes their indexes', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', []),
            document('doc-b', []),
            document('doc-c', []),
        ]);

        expect(commands.moveDocument('doc-a', 3)).toBe(true);
        expect(log.documents.map((doc) => doc.docId)).toEqual([
            'doc-b',
            'doc-c',
            'doc-a',
        ]);
        expect(log.documents.map((doc) => doc.docIndex)).toEqual([0, 1, 2]);
        expect(commands.moveDocument('doc-c', 1)).toBe(false);
        expect(history.undoStack).toHaveLength(1);
    });

    it('inserts, reorders, updates, and deletes messages with normalized indexes', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a'), message('c')])]),
        ]);

        expect(commands.addMessage('chunk-a', message('b'), 1)).toBe(true);
        expect(commands.reorderMessageInChunk('chunk-a', 2, 0)).toBe(true);
        expect(
            commands.batchUpdateMessages(new Set(['a', 'b']), {
                note: 'selected',
                role: 'npc',
            }),
        ).toBe(true);
        expect(commands.deleteMessage('chunk-a', 'b')).toBe(true);

        const messages = log.findChunkById('chunk-a')?.messages ?? [];
        expect(messages.map((item) => item.messageId)).toEqual(['c', 'a']);
        expect(messages.map((item) => item.messageIndex)).toEqual([0, 1]);
        expect(messages.find((item) => item.messageId === 'a')).toMatchObject({
            note: 'selected',
            role: 'npc',
        });
        expect(history.undoStack).toHaveLength(4);

        expect(commands.reorderMessageInChunk('chunk-a', 0, 0)).toBe(false);
        expect(commands.deleteMessage('chunk-a', 'missing')).toBe(false);
        expect(commands.batchUpdateMessages(new Set(['missing']), {})).toBe(
            false,
        );
        expect(history.undoStack).toHaveLength(4);
    });

    it('creates a blank message after the source while preserving its identity', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const source = message('source', 'Alice');
        source.account = 'alice-account';
        source.role = 'gm';
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [source, message('tail')])]),
        ]);

        expect(commands.insertNewMessageAfter('chunk-a', source, 0)).toBe(
            true,
        );
        const inserted = log.findChunkById('chunk-a')?.messages[1];
        expect(inserted).toMatchObject({
            chunkId: 'chunk-a',
            messageIndex: 1,
            playerName: 'Alice',
            account: 'alice-account',
            content: '',
            role: 'gm',
            note: '',
        });
        expect(inserted?.messageId).not.toBe('source');
        expect(inserted?.time).toBeInstanceOf(Date);
    });

    it('batch deletes across chunks and restores the complete edit with undo', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [
                chunk('chunk-a', [message('a'), message('b')]),
                chunk('chunk-b', [message('c'), message('d')]),
            ]),
        ]);

        expect(commands.batchDeleteMessages(new Set(['a', 'd']))).toBe(true);
        expect(log.allMessages.map((item) => item.messageId)).toEqual(['b', 'c']);
        expect(history.undoStack).toHaveLength(1);

        history.undo();
        expect(log.allMessages.map((item) => item.messageId)).toEqual([
            'a',
            'b',
            'c',
            'd',
        ]);
        expect(commands.batchDeleteMessages(new Set(['missing']))).toBe(false);
    });

    it('merges messages into the requested target and toggles flags in batches', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [
                chunk('chunk-a', [message('a'), message('b'), message('c')]),
            ]),
        ]);

        expect(commands.mergeMessages('chunk-a', ['a', 'c'], 'c')).toBe(true);
        expect(log.findChunkById('chunk-a')?.messages).toMatchObject([
            { messageId: 'b', messageIndex: 0 },
            { messageId: 'c', messageIndex: 1, content: 'a\nc' },
        ]);
        expect(commands.toggleOoc(new Set(['b', 'c']))).toBe(true);
        expect(commands.toggleCommand(new Set(['c']))).toBe(true);
        expect(log.messagesById.get('b')?.isOoc).toBe(true);
        expect(log.messagesById.get('c')).toMatchObject({
            isOoc: true,
            isCommand: true,
        });
        expect(history.undoStack).toHaveLength(3);

        expect(commands.mergeWithNextMessage('chunk-a', 'c')).toBe(false);
        expect(commands.toggleOoc(new Set(['missing']))).toBe(false);
        expect(commands.toggleCommand(new Set())).toBe(false);
    });

    it('updates document and chunk metadata with the expected history behavior', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a')])]),
        ]);

        expect(commands.renameDocument('doc-a', '  Session One  ')).toBe(true);
        expect(log.documents[0].docName).toBe('Session One');
        expect(log.projectName).toBe('Session One');
        expect(commands.updateChunk('chunk-a', { chunkName: ' Scene One ' })).toBe(
            true,
        );
        expect(log.documents[0].chunks[0].chunkName).toBe(' Scene One ');
        expect(history.undoStack).toHaveLength(2);

        expect(commands.setDocumentExpanded('doc-a', true)).toBe(true);
        expect(commands.setDocumentExpanded('doc-a', true)).toBe(false);
        expect(log.documents[0].isExpanded).toBe(true);
        expect(history.undoStack).toHaveLength(2);
        expect(commands.renameDocument('doc-a', '   ')).toBe(false);
        expect(commands.updateChunk('missing', { chunkName: 'x' })).toBe(false);
    });

    it('inserts copied chunks and rewrites all ownership and index fields', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        log.replaceDocuments([
            document('doc-a', [chunk('existing', [message('a')])]),
        ]);
        const copied = chunk('copied', [message('b'), message('c')]);

        expect(commands.insertChunks('doc-a', [copied], -10)).toBe(true);
        expect(log.documents[0].chunks.map((item) => item.chunkId)).toEqual([
            'copied',
            'existing',
        ]);
        expect(log.findChunkById('copied')).toMatchObject({
            docId: 'doc-a',
            chunkIndex: 0,
        });
        expect(
            log.findChunkById('copied')?.messages.map((item) => ({
                chunkId: item.chunkId,
                messageIndex: item.messageIndex,
            })),
        ).toEqual([
            { chunkId: 'copied', messageIndex: 0 },
            { chunkId: 'copied', messageIndex: 1 },
        ]);
        expect(commands.insertChunks('missing', [chunk('x', [])], 0)).toBe(
            false,
        );
        expect(commands.insertChunks('doc-a', [], 0)).toBe(false);
    });

    it('rejects invalid split, merge, move, and reorder operations without history', () => {
        const log = useLogStore();
        const commands = useLogCommands();
        const history = useHistoryStore();
        log.replaceDocuments([
            document('doc-a', [chunk('chunk-a', [message('a')])]),
            document('doc-b', [chunk('chunk-b', [message('b')])]),
        ]);

        expect(commands.splitChunk('chunk-a', 'a')).toBe(false);
        expect(commands.mergeChunks(['chunk-a', 'chunk-b'])).toBe(false);
        expect(commands.mergeWithNextChunk('chunk-a')).toBe(false);
        expect(commands.moveChunk('chunk-a', 'missing', 0)).toBe(false);
        expect(commands.moveMessages([], 'chunk-a', 'chunk-b', 0)).toBe(false);
        expect(commands.reorderChunk(-1, 0)).toBe(false);
        expect(commands.deleteChunk('missing')).toBe(false);
        expect(history.undoStack).toHaveLength(0);
    });
});
