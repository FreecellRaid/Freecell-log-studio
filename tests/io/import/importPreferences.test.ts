import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { setSSRHandler } from '@vueuse/core';
import { useFileImport } from '@/composables/application/useImporter';
import { useImportSettingsStore } from '@/stores/ui/importSettingsStore';
import { useLogStore } from '@/stores/project/logStore';
import { buildProjectFile } from '@/io/storage/project';

const storageKey = 'freecell-log-studio.import.stripOocParentheses';
const log = [
    'Alice(account) 2026/04/08 00:00:10',
    '（场外（说明））',
    'Alice(account) 2026/04/08 00:00:11',
    '(第一行',
    '第二行)',
    'Alice(account) 2026/04/08 00:00:12',
    '场内（保留）',
].join('\n');
const entry = { name: 'test-log', text: log };

describe('import preferences', () => {
    let pinia: ReturnType<typeof createPinia>;
    let stored: Map<string, string>;
    const confirm = vi.fn<Window['confirm']>();

    function reloadStores() {
        disposePinia(pinia);
        pinia = createPinia();
        setActivePinia(pinia);
    }

    beforeEach(() => {
        pinia = createPinia();
        setActivePinia(pinia);
        stored = new Map();
        setSSRHandler('getDefaultStorage', () => ({
            getItem: (key) => stored.get(key) ?? null,
            setItem: (key, value) => {
                stored.set(key, value);
            },
            removeItem: (key) => {
                stored.delete(key);
            },
        }));
        confirm.mockReset();
        vi.stubGlobal('window', { confirm });
    });

    afterEach(() => {
        disposePinia(pinia);
        setSSRHandler('getDefaultStorage', () => undefined);
        vi.unstubAllGlobals();
    });

    it('asks once for a batch, cleans only OOC content and keeps OOC flags', async () => {
        confirm.mockReturnValue(true);
        const importer = useFileImport();

        expect(await importer.importTextAndApply([entry, entry])).toBe(2);
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(stored.get(storageKey)).toBe('true');
        expect(
            useLogStore().allMessages.map(({ content, isOoc }) => ({
                content,
                isOoc,
            })),
        ).toEqual([
            { content: '场外（说明）', isOoc: true },
            { content: '第一行\n第二行', isOoc: true },
            { content: '场内（保留）', isOoc: false },
            { content: '场外（说明）', isOoc: true },
            { content: '第一行\n第二行', isOoc: true },
            { content: '场内（保留）', isOoc: false },
        ]);
    });

    it.each([true, false])(
        'remembers the choice %s across store reloads',
        async (choice) => {
            confirm.mockReturnValue(choice);
            await useFileImport().importTextAndApply([entry]);
            expect(stored.get(storageKey)).toBe(String(choice));

            reloadStores();
            await useFileImport().importTextAndApply([entry]);

            expect(confirm).toHaveBeenCalledTimes(1);
            expect(useImportSettingsStore().stripOocParentheses).toBe(choice);
            expect(useLogStore().allMessages[0].content).toBe(
                choice ? '场外（说明）' : '（场外（说明））',
            );
        },
    );

    it('applies preference changes only to later imports', async () => {
        const settings = useImportSettingsStore();
        settings.stripOocParentheses = true;
        const importer = useFileImport();
        await importer.importTextAndApply([entry]);

        settings.stripOocParentheses = false;
        await importer.importTextAndApply([entry]);

        expect(confirm).not.toHaveBeenCalled();
        expect(stored.get(storageKey)).toBe('false');
        expect(useLogStore().allMessages[0].content).toBe('场外（说明）');
        expect(useLogStore().allMessages[3].content).toBe('（场外（说明））');
    });

    it('does not ask or store a choice for empty or failed imports', async () => {
        const importer = useFileImport();
        expect(
            await importer.importTextAndApply([{ name: 'empty', text: ' ' }]),
        ).toBe(0);
        await expect(
            importer.importTextAndApply([
                { name: 'invalid', text: 'invalid log' },
            ]),
        ).rejects.toThrow('解析失败');

        expect(confirm).not.toHaveBeenCalled();
        expect(stored.has(storageKey)).toBe(false);
        expect(useLogStore().documents).toHaveLength(0);
    });

    it('asks again if the stored preference is invalid', async () => {
        stored.set(storageKey, 'invalid');
        confirm.mockReturnValue(false);

        await useFileImport().importTextAndApply([entry]);

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(stored.get(storageKey)).toBe('false');
    });

    it.each([null, true])(
        'preserves project content with preference %s',
        async (choice) => {
            const settings = useImportSettingsStore();
            settings.stripOocParentheses = false;
            await useFileImport().importTextAndApply([entry]);
            const project = buildProjectFile({
                projectId: 'project-1',
                projectName: 'saved-project',
                time: '2026-04-08T00:00:00.000Z',
                documents: useLogStore().documents,
                styleRules: [],
                viewSettings: {
                    hideOoc: false,
                    hideCommand: false,
                    enableMarkdown: false,
                    colorMode: 'playerName',
                },
            });

            reloadStores();
            const restoredSettings = useImportSettingsStore();
            restoredSettings.stripOocParentheses = choice;
            await useFileImport().importTextAndApply([
                { name: 'project', text: JSON.stringify(project) },
            ]);

            expect(confirm).not.toHaveBeenCalled();
            expect(restoredSettings.stripOocParentheses).toBe(choice);
            expect(useLogStore().allMessages[0].content).toBe(
                '（场外（说明））',
            );
        },
    );
});
