import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { ExportFormat } from '@/types/export';
import { useExportPreview } from '@/composables/application/useExportPreview';
import { useExportStore } from '@/stores/io/exportStore';
import { useLogStore } from '@/stores/project/logStore';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: vi.fn(),
    });
    useLogStore().replaceDocuments([
        {
            docId: 'doc',
            docName: 'Document',
            docIndex: 0,
            chunks: [
                {
                    chunkId: 'chunk',
                    docId: 'doc',
                    chunkName: 'Scene',
                    chunkIndex: 0,
                    messages: [
                        {
                            messageId: 'message',
                            chunkId: 'chunk',
                            messageIndex: 0,
                            playerName: 'Alice',
                            account: '10001',
                            time: new Date('2026-01-01T00:00:00Z'),
                            content: 'hello',
                            isOoc: false,
                            isCommand: false,
                            role: 'pl',
                            note: '',
                        },
                    ],
                },
            ],
        },
    ]);
});

afterEach(() => vi.unstubAllGlobals());

describe('shared export preview data', () => {
    it('binds to the requested template even when the active export template changes', () => {
        const preview = useExportPreview('standard');
        const before = preview.rowsWithId.value;
        useExportStore().setActive('markdown');
        expect(preview.activeFormat.value?.formatId).toBe('standard');
        expect(preview.rowsWithId.value).toEqual(before);
        expect(
            before.some(
                (row) =>
                    row.type === 'message' && row.plainText.includes('hello'),
            ),
        ).toBe(true);
    });

    it('updates rendered rows when the window target changes', () => {
        const target = ref('standard');
        const preview = useExportPreview(target);
        const before = preview.rowsWithId.value;
        target.value = 'markdown';
        expect(preview.activeFormat.value?.formatId).toBe('markdown');
        expect(preview.rowsWithId.value).not.toEqual(before);
    });

    it('returns missing-template state instead of rendering another template', () => {
        const exportStore = useExportStore();
        const preview = useExportPreview('standard');
        exportStore.formats = exportStore.formats.filter(
            (format: ExportFormat) => format.formatId !== 'standard',
        );
        expect(preview.activeFormat.value).toBeUndefined();
        expect(preview.rowsWithId.value).toEqual([]);
    });
});
