import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { useProjectManager } from '@/composables/application/useProjectManager';
import { useWorkspaceActions } from '@/composables/application/useWorkspaceActions';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useFileImport } from '@/composables/application/useImporter';
import { migrateProjectFileTo } from '@/io/storage/projectFile';
import { projectRepository } from '@/io/storage/projectStorage';
import { buildLogDocument } from '@/io/import/parser';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { workspaceProjectToFile } from '@/io/storage/workspaceProject';

vi.mock('@/io/storage/projectStorage', () => ({
    projectRepository: {
        initialize: vi.fn(),
        save: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    },
}));

function deferred() {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('asynchronous project operations', () => {
    let pinia: ReturnType<typeof createPinia>;
    beforeEach(() => {
        vi.resetAllMocks();
        pinia = createPinia();
        setActivePinia(pinia);
        vi.stubGlobal('window', { confirm: vi.fn(() => true) });
        vi.stubGlobal('navigator', {});
        vi.stubGlobal('alert', vi.fn());
        vi.mocked(projectRepository.initialize).mockResolvedValue({
            key: 'localStorage-projects-v1',
            completedAt: '2026-10-19T00:00:00Z',
            importedCount: 0,
            skippedCount: 0,
            warnings: [],
        });
        vi.mocked(projectRepository.save).mockResolvedValue();
        const log = useLogStore();
        log.replaceDocuments([
            buildLogDocument([{ content: 'original' }], 'test', 0),
        ]);
        useHistoryStore().clearHistory();
    });
    afterEach(() => {
        disposePinia(pinia);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    function edit(content: string) {
        const message = useLogStore().allMessages[0];
        expect(
            useLogCommands().updateMessage(message.chunkId, message.messageId, {
                content,
            }),
        ).toBe(true);
    }

    it('does not queue linked resources when restoring a snapshot or opening a project', async () => {
        const manager = useProjectManager();
        const project = manager.createCurrentWorkspaceProject();
        project.documents[0].chunks[0].messages[0].images = [
            { imageId: 'image', resourceId: 'linked', name: '地图' },
        ];
        project.resources = {
            linked: { type: 'image', sourceUrl: 'https://example.com/map.png' },
        };
        const downloading = vi.spyOn(resourceRepository, 'download');
        expect(
            await manager.replaceWorkspaceWithProject(project, {
                resourcesReady: true,
            }),
        ).toBe(true);
        expect(useResourceTasksStore().summarize().total).toBe(0);
        vi.mocked(projectRepository.get).mockResolvedValueOnce(
            workspaceProjectToFile(project),
        );
        expect(await manager.openStoredProject(project.projectId)).toBe(true);
        expect(useLogStore().allMessages[0].images).toHaveLength(1);
        expect(useResourceTasksStore().summarize().total).toBe(0);
        expect(downloading).not.toHaveBeenCalled();
    });
    it('marks only the submitted snapshot as saved when editing continues during a save', async () => {
        const wait = deferred();
        vi.mocked(projectRepository.save).mockReturnValueOnce(wait.promise);
        const manager = useProjectManager();
        edit('first');
        const saving = manager.saveCurrentProjectToLocal();
        await vi.waitFor(() =>
            expect(projectRepository.save).toHaveBeenCalledTimes(1),
        );
        expect(manager.storageState.isSaving).toBe(true);
        edit('second');
        wait.resolve();
        await saving;
        expect(
            vi.mocked(projectRepository.save).mock.calls[0][0].documents[0]
                .chunks[0].messages[0].content,
        ).toBe('first');
        expect(useHistoryStore().hasUnsavedChanges()).toBe(true);
        expect(manager.storageState.isSaving).toBe(false);
        await manager.saveCurrentProjectToLocal();
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });

    it('serializes saves across composable instances and captures each call immediately', async () => {
        const wait = deferred();
        vi.mocked(projectRepository.save).mockReturnValueOnce(wait.promise);
        edit('first');
        const first = useProjectManager().saveCurrentProjectToLocal();
        await vi.waitFor(() =>
            expect(projectRepository.save).toHaveBeenCalledTimes(1),
        );
        edit('second');
        const second = useProjectManager().saveCurrentProjectToLocal();
        expect(projectRepository.save).toHaveBeenCalledTimes(1);
        wait.resolve();
        await Promise.all([first, second]);
        expect(
            vi
                .mocked(projectRepository.save)
                .mock.calls.map(
                    ([file]) => file.documents[0].chunks[0].messages[0].content,
                ),
        ).toEqual(['first', 'second']);
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });

    it('preserves the dirty state and timestamp after failure, then allows another save', async () => {
        const manager = useProjectManager();
        useLogStore().setProjectTime('previous');
        edit('unsaved');
        vi.mocked(projectRepository.save).mockRejectedValueOnce(
            new Error('write failed'),
        );
        await expect(manager.saveCurrentProjectToLocal()).rejects.toThrow(
            'write failed',
        );
        expect(useHistoryStore().hasUnsavedChanges()).toBe(true);
        expect(useLogStore().projectTime).toBe('previous');
        expect(manager.storageState.isSaving).toBe(false);
        await manager.saveCurrentProjectToLocal();
        expect(useHistoryStore().hasUnsavedChanges()).toBe(false);
    });

    it('does not mark another workspace saved if the user switches during a pending save', async () => {
        const wait = deferred();
        vi.mocked(projectRepository.save).mockReturnValueOnce(wait.promise);
        const saving = useProjectManager().saveCurrentProjectToLocal();
        await vi.waitFor(() =>
            expect(projectRepository.save).toHaveBeenCalledTimes(1),
        );
        useLogStore().clearData();
        useLogStore().replaceDocuments([
            buildLogDocument([{ content: 'other project' }], 'other', 0),
        ]);
        useHistoryStore().clearHistory();
        edit('other unsaved edit');
        wait.resolve();
        await saving;
        expect(useLogStore().projectTime).toBe('');
        expect(useHistoryStore().hasUnsavedChanges()).toBe(true);
    });

    it('awaits restoration and honors a canceled confirmation', async () => {
        const manager = useProjectManager();
        const file = migrateProjectFileTo(
            manager.createCurrentWorkspaceProject(),
        ).project;
        file.projectName = 'saved name';
        vi.mocked(projectRepository.get).mockResolvedValue(file);
        vi.mocked(window.confirm).mockReturnValueOnce(false);
        expect(await manager.openStoredProject(file.projectId)).toBe(false);
        expect(useLogStore().projectName).not.toBe('saved name');
        expect(await manager.openStoredProject(file.projectId)).toBe(true);
        expect(useLogStore().projectName).toBe('saved name');
        expect(useLogStore().allMessages[0].time).toBeInstanceOf(Date);
    });

    it('shows save errors and does not run success feedback before persistence finishes', async () => {
        const wait = deferred();
        vi.mocked(projectRepository.save).mockReturnValueOnce(wait.promise);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const afterSave = vi.fn();
        const saving = useWorkspaceActions().saveCurrentProjectWithFeedback({
            afterSave,
        });
        await vi.waitFor(() =>
            expect(projectRepository.save).toHaveBeenCalledTimes(1),
        );
        expect(alert).not.toHaveBeenCalled();
        expect(afterSave).not.toHaveBeenCalled();
        wait.reject(new Error('permission denied'));
        expect(await saving).toBe(false);
        expect(alert).toHaveBeenCalledWith('permission denied');
        expect(afterSave).not.toHaveBeenCalled();
    });

    it('imports a text-only v3 export with a new project ID', async () => {
        const manager = useProjectManager();
        const file = migrateProjectFileTo(
            manager.createCurrentWorkspaceProject(),
        ).project;
        expect(
            await useFileImport().importTextAndApply([
                { name: 'v3', text: JSON.stringify(file) },
            ]),
        ).toBe(1);
        expect(useLogStore().projectId).not.toBe(file.projectId);
        expect(useLogStore().allMessages[0].content).toBe('original');
    });

    it('exports v3 JSON with serialized regex filters and no schema downgrade', async () => {
        const manager = useProjectManager();
        useStyleStore().replaceRules([
            {
                ruleId: 'regexp',
                ruleName: 'regexp',
                filter: { content: /hello/gi },
                style: {},
                area: 'content',
                priority: 1,
                isActive: true,
            },
        ]);
        const click = vi.fn();
        const link = { href: '', download: '', click };
        const createObjectURL = vi.fn((_blob: Blob) => 'blob:test');
        vi.stubGlobal('document', {
            createElement: () => link,
            body: { appendChild: vi.fn(), removeChild: vi.fn() },
        });
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
        await manager.exportCurrentProject();
        const blob = createObjectURL.mock.calls[0][0] as Blob;
        const exported = JSON.parse(await blob.text());
        expect(exported).toMatchObject({
            schema: 'freecell-project',
            version: 3,
            resources: {},
        });
        expect(exported.documents[0].chunks[0].messages[0].images).toEqual([]);
        expect(exported.styleRules[0].filter.content).toEqual({
            type: 'regexp',
            source: 'hello',
            flags: 'gi',
        });
        expect(click).toHaveBeenCalledTimes(1);
    });
});
