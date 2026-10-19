import { describe, expect, it } from 'vitest';
import example from '../../../docs/examples/project-v3.json';
import {
    migrateProjectFileTo,
    parseProjectFile,
    restoreMessageFilter,
    stringifyProjectFile,
    validateProjectFile,
} from '@/io/storage/projectFile';
import {
    normalizeProjectFile,
    tryParseProjectFile,
} from '@/io/storage/project';

const fixture = () => structuredClone(example);

describe('project file v3 contract', () => {
    it('round trips embedded, remote, cached and missing images without losing order or bytes', () => {
        const { project, warnings } = parseProjectFile(
            JSON.stringify(fixture()),
        );
        expect(project).toEqual(example);
        expect(warnings).toEqual([
            expect.objectContaining({ path: '/resources/missing' }),
        ]);
        expect(parseProjectFile(stringifyProjectFile(project)).project).toEqual(
            project,
        );
        expect(
            project.documents[0].chunks[0].messages[0].images.map(
                (image) => image.resourceId,
            ),
        ).toEqual(['local', 'remote', 'cached', 'missing']);
    });

    it('preserves missing resource references as recoverable warnings', () => {
        const project = fixture();
        delete (project.resources as Record<string, unknown>).local;
        const result = parseProjectFile(JSON.stringify(project));
        expect(
            result.project.documents[0].chunks[0].messages[0].images[0]
                .resourceId,
        ).toBe('local');
        expect(
            result.warnings.some((issue) =>
                issue.path.endsWith('/images/0/resourceId'),
            ),
        ).toBe(true);
    });

    it('accepts pure-image and text-only messages, including shared resource references', () => {
        const project = fixture();
        const message = project.documents[0].chunks[0].messages[0];
        message.content = '';
        message.images.push({
            imageId: 'second-local',
            resourceId: 'local',
            name: '另一次引用',
        });
        expect(validateProjectFile(project).valid).toBe(true);
        message.images = [];
        message.content = '只有文字';
        project.resources = {} as typeof project.resources;
        expect(validateProjectFile(project)).toEqual({
            valid: true,
            errors: [],
            warnings: [],
        });
    });

    it.each(['%%%', 'AAAA=', 'AB=='])(
        'rejects malformed or noncanonical Base64: %s',
        (value) => {
            const project = fixture();
            project.resources.local.data.value = value;
            expect(validateProjectFile(project).valid).toBe(false);
        },
    );

    it('rejects incorrect byte lengths and embedded data without a MIME type', () => {
        const project = fixture();
        project.resources.local.byteLength++;
        expect(validateProjectFile(project).errors).toContainEqual(
            expect.objectContaining({ path: '/resources/local/byteLength' }),
        );
        delete (project.resources.local as Record<string, unknown>).mimeType;
        expect(validateProjectFile(project).valid).toBe(false);
    });

    it.each([
        'blob:temporary',
        'file:///tmp/map.png',
        '../map.png',
        'https://',
        'https://user:password@example.com/map.png',
    ])('rejects an unstable or invalid source URL: %s', (url) => {
        const project = fixture();
        project.resources.remote.sourceUrl = url;
        expect(validateProjectFile(project).valid).toBe(false);
    });

    it.each([
        '2026-02-30T00:00:00Z',
        '2026-10-19',
        '2026-10-19T24:00:00Z',
        '2026-10-19T00:00:00+24:00',
    ])('rejects invalid timestamps: %s', (time) => {
        const project = fixture();
        project.documents[0].chunks[0].messages[0].time = time;
        expect(validateProjectFile(project).valid).toBe(false);
    });

    it('checks filter timestamps and executable regular expressions', () => {
        const project = fixture();
        project.styleRules[0].filter.timeStart = '2026-02-30T00:00:00Z';
        project.styleRules[0].filter.content.flags = 'ii';
        const result = validateProjectFile(project);
        expect(result.errors.map((issue) => issue.path)).toContain(
            '/styleRules/0/filter/timeStart',
        );
        expect(result.errors.map((issue) => issue.path)).toContain(
            '/styleRules/0/filter/content',
        );
    });

    it('detects duplicate IDs and incorrect parent references', () => {
        const project = fixture();
        const chunk = project.documents[0].chunks[0];
        chunk.docId = 'wrong-document';
        chunk.messages[0].chunkId = 'wrong-chunk';
        chunk.messages[0].images[1].imageId =
            chunk.messages[0].images[0].imageId;
        expect(validateProjectFile(project).errors).toHaveLength(3);
    });

    it('rejects unknown fields rather than silently discarding them', () => {
        const project = { ...fixture(), objectUrl: 'blob:runtime-only' };
        expect(validateProjectFile(project).valid).toBe(false);
    });

    it('restores date and regular expression filters without mutating the DTO', () => {
        const { project } = parseProjectFile(JSON.stringify(fixture()));
        const filter = restoreMessageFilter(project.styleRules[0].filter);
        expect(filter.content).toBeInstanceOf(RegExp);
        expect((filter.content as RegExp).test('图片')).toBe(true);
        expect(filter.timeStart).toBeInstanceOf(Date);
        expect(filter.hasImage).toBe(true);
        expect(project.styleRules[0].filter.content).toEqual({
            type: 'regexp',
            source: '场景|图片',
            flags: 'i',
        });
    });

    it('does not share references with a parsed input object', () => {
        const original = fixture();
        const { project } = migrateProjectFileTo(original);
        project.documents[0].chunks[0].messages[0].images[0].name = 'changed';
        expect(original.documents[0].chunks[0].messages[0].images[0].name).toBe(
            '本地地图',
        );
    });
});

describe('legacy project migrations', () => {
    const legacy = () => ({
        version: 2,
        projectId: 'legacy',
        projectName: '旧工程',
        time: '2026-10-19T08:00:00Z',
        documents: [
            {
                docId: 'doc',
                docName: '日志',
                docIndex: 0,
                chunks: [
                    {
                        chunkId: 'chunk',
                        docId: 'doc',
                        chunkName: '场景',
                        chunkIndex: 0,
                        messages: [
                            {
                                messageId: 'message',
                                chunkId: 'chunk',
                                messageIndex: 0,
                                playerName: 'Alice',
                                account: '1',
                                time: '2026-10-19T08:00:00Z',
                                content: '原始正文',
                                isOoc: false,
                                isCommand: false,
                                role: 'pl',
                                note: '',
                                meta: { source: 'test' },
                            },
                        ],
                    },
                ],
            },
        ],
        styleRules: [
            {
                ruleId: 'rule',
                ruleName: 'test',
                filter: {
                    content: /test/gi,
                    timeStart: new Date('2026-10-19T00:00:00Z'),
                },
                style: { bold: true },
                area: 'content',
                priority: 1,
                isActive: true,
            },
        ],
        viewSettings: example.viewSettings,
    });

    it('migrates v2 and preserves metadata, identifiers, dates and runtime regex filters', () => {
        const source = legacy();
        const { project } = migrateProjectFileTo(source);
        expect(project.version).toBe(3);
        expect(project.schema).toBe('freecell-project');
        expect(project.resources).toEqual({});
        expect(project.documents[0].chunks[0].messages[0]).toMatchObject({
            messageId: 'message',
            content: '原始正文',
            images: [],
            meta: { source: 'test' },
        });
        expect(project.styleRules[0].filter.content).toEqual({
            type: 'regexp',
            source: 'test',
            flags: 'gi',
        });
        expect(project.styleRules[0].filter.timeStart).toBe(
            '2026-10-19T00:00:00.000Z',
        );
        expect(source).not.toHaveProperty('schema');
        expect(source.documents[0].chunks[0].messages[0]).not.toHaveProperty(
            'images',
        );
    });

    it('migrates v1 color rules and unversioned legacy projects', () => {
        const source = {
            ...legacy(),
            version: 1,
            styleRules: undefined,
            colorRules: [
                {
                    ruleId: 'old-rule',
                    color: '#abcdef',
                    colorArea: 'playerName',
                    filter: {},
                },
            ],
        };
        const { project } = migrateProjectFileTo(source);
        expect(project.styleRules[0]).toMatchObject({
            style: { color: '#abcdef' },
            area: 'playerName',
        });
        expect(project).not.toHaveProperty('colorRules');
        expect(migrateProjectFileTo({ documents: [] }).project.version).toBe(3);
    });

    it.each([0, 4, 99, '3', null])(
        'rejects unsupported version %s',
        (version) => {
            expect(() =>
                migrateProjectFileTo({ ...fixture(), version }),
            ).toThrow();
        },
    );

    it('rejects malformed JSON and foreign schemas', () => {
        expect(() => parseProjectFile('{')).toThrow('JSON');
        expect(() =>
            migrateProjectFileTo({ ...fixture(), schema: 'other-project' }),
        ).toThrow();
    });

    it('prevents the existing v2 reader from downgrading v3/future files', () => {
        expect(() => normalizeProjectFile(fixture())).toThrow('版本');
        expect(tryParseProjectFile(JSON.stringify(fixture()))).toBeNull();
        expect(() =>
            normalizeProjectFile({ documents: [], version: 99 }),
        ).toThrow('版本');
        expect(normalizeProjectFile(legacy()).version).toBe(2);
    });
});
