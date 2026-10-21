import { describe, expect, it } from 'vitest';
import { buildWorkspaceProject } from '@/io/storage/project';
import { normalizeLegacyProject } from '@/io/storage/legacyProject';
import type { StyleRule } from '@/types/style';

const viewSettings = {
    hideOoc: false,
    hideCommand: false,
    enableMarkdown: false,
    colorMode: 'playerName' as const,
};

describe('project style rule persistence', () => {
    it('migrates v1 color rules into runtime style rules', () => {
        const project = normalizeLegacyProject({
            version: 1,
            projectId: 'project-1',
            projectName: 'legacy',
            time: '2026-01-01T00:00:00.000Z',
            documents: [],
            colorRules: [
                {
                    ruleId: 'rule-1',
                    ruleName: 'legacy rule',
                    filter: { playerName: 'Alice' },
                    color: '#abcdef',
                    colorArea: 'playerName',
                    priority: 1,
                    isActive: true,
                },
            ],
            viewSettings,
        });

        expect(project).not.toHaveProperty('version');
        expect(project.styleRules).toEqual([
            {
                ruleId: 'rule-1',
                ruleName: 'legacy rule',
                filter: { playerName: 'Alice' },
                style: { color: '#abcdef' },
                area: 'playerName',
                priority: 1,
                isActive: true,
            },
        ]);
        expect(project).not.toHaveProperty('colorRules');
    });

    it('normalizes v2 effects and invalid areas safely', () => {
        const project = normalizeLegacyProject({
            version: 2,
            projectId: 'project-2',
            projectName: 'current',
            documents: [],
            styleRules: [
                {
                    ruleId: 'rule-2',
                    style: { bold: true, italic: false, color: 123 },
                    area: 'invalid',
                },
            ],
            viewSettings,
        });

        expect(project.styleRules[0]).toMatchObject({
            style: { bold: true },
            area: 'all',
        });
    });

    it('builds unversioned runtime data and clones style objects', () => {
        const styleRules = [
            {
                ruleId: 'rule-3',
                ruleName: 'bold',
                filter: {},
                style: { bold: true as const },
                area: 'content' as const,
                priority: 1,
                isActive: true,
            },
        ];
        const project = buildWorkspaceProject({
            projectId: 'project-3',
            projectName: 'current',
            documents: [],
            styleRules,
            viewSettings,
        });

        expect(project).not.toHaveProperty('version');
        expect(project).not.toHaveProperty('colorRules');
        expect(project.styleRules).not.toBe(styleRules);
        expect(project.styleRules[0].style).not.toBe(styleRules[0].style);
    });
});

describe('project rule filter cloning', () => {
    function rule(): StyleRule {
        return {
            ruleId: 'range-rule',
            ruleName: 'range',
            filter: {
                time: new Date('2026-10-13T12:00:00Z'),
                timeStart: new Date('2026-10-13T00:00:00Z'),
                timeEnd: new Date('2026-10-14T00:00:00Z'),
                role: ['pl', 'gm'],
                playerName: ['Alice'],
                messageIndex: [1, 2],
                content: /test/gi,
            },
            style: { color: '#abcdef' },
            area: 'content',
            priority: 1,
            isActive: true,
        };
    }

    it('isolates mutable filter values from the saved project', () => {
        const original = rule();
        const project = buildWorkspaceProject({
            projectId: 'range-project',
            projectName: 'range',
            documents: [],
            styleRules: [original],
            viewSettings,
        });
        const saved = project.styleRules[0];
        expect(saved).toEqual(original);
        for (const key of [
            'time',
            'timeStart',
            'timeEnd',
            'role',
            'playerName',
            'messageIndex',
            'content',
        ] as const) {
            expect(saved.filter[key]).not.toBe(original.filter[key]);
        }

        original.filter.timeStart!.setTime(0);
        original.filter.timeEnd!.setTime(0);
        (original.filter.role as string[]).push('bot');
        expect(saved.filter.timeStart!.toISOString()).toBe(
            '2026-10-13T00:00:00.000Z',
        );
        expect(saved.filter.timeEnd!.toISOString()).toBe(
            '2026-10-14T00:00:00.000Z',
        );
        expect(saved.filter.role).toEqual(['pl', 'gm']);
    });

    it('restores time range dates after a project JSON round trip', () => {
        const original = rule();
        const project = buildWorkspaceProject({
            projectId: 'range-project',
            projectName: 'range',
            documents: [],
            styleRules: [original],
            viewSettings,
        });
        const restored = normalizeLegacyProject(
            JSON.parse(JSON.stringify(project)),
        );
        expect(restored.styleRules[0].filter.timeStart).toEqual(
            original.filter.timeStart,
        );
        expect(restored.styleRules[0].filter.timeEnd).toEqual(
            original.filter.timeEnd,
        );
        expect(restored.styleRules[0].filter.timeStart).toBeInstanceOf(Date);
        expect(restored.styleRules[0].filter.timeEnd).toBeInstanceOf(Date);
    });
});
