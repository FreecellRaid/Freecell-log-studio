import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { setSSRHandler } from '@vueuse/core';
import { useRemoteImportStore } from '@/stores/ui/remoteImportStore';
import { useLogStore } from '@/stores/project/logStore';
import { useImportSettingsStore } from '@/stores/ui/importSettingsStore';
import { useFileImport } from '@/composables/application/useImporter';
import { useLogCommands } from '@/stores/project/logCommands';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { readRemoteLog } from '@/io/import/remoteReader';
import type { ImportTextEntry } from '@/types/import';

vi.mock('@/io/import/remoteReader', () => ({ readRemoteLog: vi.fn() }));
const reader = vi.mocked(readRemoteLog);
const log = 'Alice(10001) 2026-10-09 20:00:00\nhello\n';
const entry: ImportTextEntry = {
    name: 'remote',
    text: log,
    format: 'standard-adapter',
    source: { provider: 'oliva', id: 'log_a' },
};

describe('remote import workflow', () => {
    let pinia: ReturnType<typeof createPinia>;
    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        const stored = new Map<string, string>();
        setSSRHandler('getDefaultStorage', () => ({
            getItem: (key) => stored.get(key) ?? null,
            setItem: (key, value) => {
                stored.set(key, value);
            },
            removeItem: (key) => {
                stored.delete(key);
            },
        }));
        vi.stubGlobal('window', { confirm: vi.fn(() => false) });
        useImportSettingsStore().stripOocParentheses = false;
        reader.mockReset();
    });
    afterEach(() => {
        useRemoteImportStore().cancel();
        disposePinia(pinia);
        setSSRHandler('getDefaultStorage', () => undefined);
        vi.unstubAllGlobals();
    });

    it('appends remote logs and prevents duplicate imports into the current workspace', async () => {
        await useFileImport().importRowsAndApply(
            [{ content: 'existing' }],
            'local',
        );
        reader.mockResolvedValue(entry);
        const store = useRemoteImportStore();
        await store.importLink('#2-log_a');
        expect(useLogStore().documents).toHaveLength(2);
        expect(
            useLogStore().allMessages.map((message) => message.content),
        ).toEqual(['existing', 'hello']);
        expect(store.visible).toBe(false);
        await store.importLink('#2-log_a');
        expect(useLogStore().documents).toHaveLength(2);
        expect(store.message).toContain('已在当前工作区');
        useLogStore().clearData();
        await store.importLink('#2-log_a');
        expect(useLogStore().documents).toHaveLength(1);
    });

    it('discards an old result when the link changes, even if the transport ignores abort', async () => {
        let finishOld!: (value: ImportTextEntry) => void;
        reader.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishOld = resolve;
                }),
        );
        reader.mockResolvedValueOnce({
            ...entry,
            source: { provider: 'oliva', id: 'log_b' },
        });
        const store = useRemoteImportStore();
        const old = store.importLink('#2-log_a');
        await store.importLink('#2-log_b');
        finishOld(entry);
        await old;
        expect(useLogStore().documents).toHaveLength(1);
        expect(useLogStore().documents[0].source?.id).toBe('log_b');
        expect(store.loading).toBe(false);
    });

    it('cancels a request and permits retry after failure', async () => {
        let finish!: (value: ImportTextEntry) => void;
        reader.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const store = useRemoteImportStore();
        const pending = store.importLink('#2-log_a');
        const signal = reader.mock.calls[0][1]?.signal;
        store.close();
        expect(signal?.aborted).toBe(true);
        finish(entry);
        await pending;
        expect(useLogStore().documents).toHaveLength(0);
        reader.mockRejectedValueOnce(new Error('expired'));
        await store.importLink('#2-log_a');
        expect(store.error).toBe('expired');
        expect(store.visible).toBe(true);
        reader.mockResolvedValueOnce(entry);
        await store.importLink();
        expect(store.error).toBe('');
        expect(useLogStore().documents).toHaveLength(1);
    });

    it('cannot replace the workspace when a remote server returns project JSON', async () => {
        await useFileImport().importRowsAndApply(
            [{ content: 'keep me' }],
            'local',
        );
        reader.mockResolvedValue({
            ...entry,
            format: undefined,
            text: JSON.stringify({ version: 2, projectId: 'p', documents: [] }),
        });
        await useRemoteImportStore().importLink('#2-log_a');
        expect(useRemoteImportStore().error).toContain('解析失败');
        expect(useLogStore().allMessages[0].content).toBe('keep me');
    });

    it('retains source and message metadata after editing, undo and redo', async () => {
        await useFileImport().importRowsAndApply(
            [
                {
                    content: 'before',
                    originalMessageId: 'platform-1',
                    meta: { nested: { count: 1 } },
                    role: 'bot',
                },
            ],
            'log',
            { provider: 'oliva', id: 'log_a' },
        );
        const message = useLogStore().allMessages[0];
        useLogCommands().updateMessage(message.chunkId, message.messageId, {
            content: 'after',
        });
        useHistoryStore().undo();
        expect(useLogStore().allMessages[0]).toMatchObject({
            content: 'before',
            originalMessageId: 'platform-1',
            meta: { nested: { count: 1 } },
        });
        expect(useLogStore().documents[0].source).toEqual({
            provider: 'oliva',
            id: 'log_a',
        });
        useHistoryStore().redo();
        expect(useLogStore().allMessages[0].content).toBe('after');
        expect(useLogStore().allMessages[0].originalMessageId).toBe(
            'platform-1',
        );
    });
});
