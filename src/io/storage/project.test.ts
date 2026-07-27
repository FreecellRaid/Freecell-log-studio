import { describe, expect, it } from 'vitest';
import { buildProjectFile, normalizeProjectFile } from './project';

const viewSettings = {
    hideOoc: false,
    hideCommand: false,
    enableMarkdown: false,
    colorMode: 'playerName' as const,
};

describe('project style rule persistence', () => {
    it('migrates v1 color rules to v2 style rules', () => {
        const project = normalizeProjectFile({
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

        expect(project.version).toBe(2);
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
        const project = normalizeProjectFile({
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

    it('writes only the v2 structure and clones style objects', () => {
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
        const project = buildProjectFile({
            projectId: 'project-3',
            projectName: 'current',
            documents: [],
            styleRules,
            viewSettings,
        });

        expect(project.version).toBe(2);
        expect(project).not.toHaveProperty('colorRules');
        expect(project.styleRules).not.toBe(styleRules);
        expect(project.styleRules[0].style).not.toBe(styleRules[0].style);
    });
});
