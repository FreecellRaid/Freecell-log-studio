import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import { buildLogDocument } from '@/io/import/parser';
import { matchesMessageFilter } from '@/editor/filter';
import { workspaceProjectToFile } from '@/io/storage/workspaceProject';
import { buildProjectFile } from '@/io/storage/project';
import { useStyleStore } from '@/stores/project/styleStore';

describe('image attachment editing', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        const log = useLogStore();
        log.replaceDocuments([
            buildLogDocument(
                [{ content: 'first' }, { content: 'second' }],
                'log',
                0,
            ),
        ]);
        log.allMessages[0].images = [
            { imageId: 'a', resourceId: 'shared', name: '地图' },
        ];
        log.allMessages[1].images = [
            { imageId: 'b', resourceId: 'other', name: '场景' },
        ];
        useHistoryStore().clearHistory();
    });
    it('merges text before images, preserving attachment order and undo/redo', () => {
        const log = useLogStore();
        const [first, second] = log.allMessages;
        useLogCommands().mergeMessages(first.chunkId, [
            first.messageId,
            second.messageId,
        ]);
        expect(log.allMessages[0].content).toBe('first\nsecond');
        expect(
            log.allMessages[0].images?.map((image) => image.imageId),
        ).toEqual(['a', 'b']);
        useHistoryStore().undo();
        expect(log.allMessages).toHaveLength(2);
        expect(
            log.allMessages[0].images?.map((image) => image.imageId),
        ).toEqual(['a']);
        useHistoryStore().redo();
        expect(log.allMessages[0].images).toHaveLength(2);
    });
    it('copies attachments independently and regenerates attachment IDs while sharing resources', () => {
        const clipboard = useClipboardStore();
        const message = useLogStore().allMessages[0];
        clipboard.copyMessages([message]);
        message.images![0].name = 'changed';
        const pasted = clipboard.getPasteMessages()[0];
        expect(pasted.images![0].name).toBe('地图');
        expect(pasted.images![0].imageId).not.toBe('a');
        expect(pasted.images![0].resourceId).toBe('shared');
        pasted.images![0].name = 'pasted';
        expect(clipboard.getPasteMessages()[0].images![0].name).toBe('地图');
    });
    it('keeps snapshots independent when renaming or removing images', () => {
        const log = useLogStore();
        const message = log.allMessages[0];
        useLogCommands().updateMessage(message.chunkId, message.messageId, {
            images: [],
        });
        expect(useHistoryStore().hasUnsavedChanges()).toBe(true);
        useHistoryStore().undo();
        expect(log.allMessages[0].images![0].name).toBe('地图');
    });
    it('serializes attachments and image filters without putting binary data into runtime snapshots', () => {
        const log = useLogStore();
        const style = useStyleStore();
        style.replaceRules([
            {
                ruleId: 'images',
                ruleName: 'images',
                filter: { hasImage: true },
                style: { bold: true },
                area: 'content',
                priority: 1,
                isActive: true,
            },
        ]);
        const file = workspaceProjectToFile(
            buildProjectFile({
                projectId: log.projectId,
                projectName: 'test',
                documents: log.documents,
                styleRules: style.rules,
                viewSettings: style.viewSettings,
            }),
        );
        expect(
            file.documents[0].chunks[0].messages[0].images![0].resourceId,
        ).toBe('shared');
        expect(file.resources.shared).toEqual({ type: 'image' });
        expect(file.styleRules[0].filter.hasImage).toBe(true);
        expect(
            matchesMessageFilter(log.allMessages[0], { hasImage: true }),
        ).toBe(true);
        expect(
            matchesMessageFilter(
                { ...log.allMessages[0], images: [] },
                { hasImage: false },
            ),
        ).toBe(true);
    });
});
