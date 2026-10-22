import { defineStore } from 'pinia';
import {
    DEFAULT_IMAGE_TEMPLATE,
    normalizeExportFormat,
    type ExportFormat,
} from '@/types/export';
import { generateId } from '@/utils/id';

export const EXPORT_PRESET_IDS = [
    'magic',
    'standard',
    'markdown',
    'bbcode',
    'markdownNameColor',
    'classicTrpgLog',
    'hangingIndent',
    'echoWorkshop',
] as const;

export const PRESETS: ExportFormat[] = [
    {
        formatId: 'classicTrpgLog',
        formatName: '经典染色器格式',
        fileExtension: '.docx',
        playerNameFormat: '<{{name}}>:',
        accountFormat: '',
        timeFormat: '{{time}}',
        docSeparator: '=== {{name}} ===\n',
        chunkSeparator: '\n',
        imageTemplate: '{{time}}{{name}} [图片：{{imageName}}]',
        messageTemplate: '{{time}}{{name}} {{content}}',
        messageSeparator: '\n',
    },
    {
        formatId: 'classicTrpgLogWithImage',
        formatName: '经典染色器格式(含图片)',
        fileExtension: '.docx',
        playerNameFormat: '<{{name}}>:',
        accountFormat: '',
        timeFormat: '{{time}}',
        docSeparator: '=== {{name}} ===\n',
        chunkSeparator: '\n',
        imageTemplate: '{{time}}{{name}} {{image}}',
        messageTemplate: '{{time}}{{name}} {{content}}',
        messageSeparator: '\n',
    },
    {
        formatId: 'hangingIndent',
        formatName: '悬挂缩进格式',
        fileExtension: '.docx',
        playerNameFormat: '{{name}}',
        accountFormat: '',
        timeFormat: '',
        docSeparator: '=== {{name}} ===\n',
        chunkSeparator: '--- {{name}} ---\n',
        imageTemplate: '{{name}}\t[图片：{{imageName}}]',
        messageTemplate: '{{name}}\t{{content}}',
        messageSeparator: '\n',
    },
    {
        formatId: 'standard',
        formatName: '标准 log 格式',
        fileExtension: '.txt',
        playerNameFormat: '{{name}}',
        accountFormat: '({{account}})',
        timeFormat: '{{time}}',
        docSeparator: '\n',
        chunkSeparator: '',
        imageTemplate: '{{name}}{{account}} {{time}}\n[图片：{{imageName}}]',
        messageTemplate: '{{name}}{{account}} {{time}}\n{{content}}',
        messageSeparator: '\n\n',
    },
    {
        formatId: 'markdown',
        formatName: 'Markdown 格式',
        fileExtension: '.md',
        playerNameFormat: '**{{name}}**',
        accountFormat: '`{{account}}`',
        timeFormat: '*{{time}}*',
        docSeparator: '# {{name}}\n',
        chunkSeparator: '## {{name}}\n',
        imageTemplate: '![{{imageName}}]({{imageUrl}})\n',
        messageTemplate: '{{name}} {{account}} {{time}}\n\n> {{content}}',
        messageSeparator: '\n---\n',
    },
    {
        formatId: 'markdownNameColor',
        formatName: 'Markdown 格式(姓名着色)',
        fileExtension: '.md',
        playerNameFormat: '<span style="color: {{nameColor}}">{{name}}</span>',
        accountFormat: '`{{account}}`',
        timeFormat: '*{{time}}*',
        docSeparator: '# {{name}}\n',
        chunkSeparator: '## {{name}}\n',
        imageTemplate: '![{{imageName}}]({{imageUrl}})\n',
        messageTemplate: '{{name}} {{account}} {{time}}\n\n> {{content}}',
        messageSeparator: '\n---\n',
    },
    {
        formatId: 'bbcode',
        formatName: 'BBCode 格式',
        fileExtension: '.txt',
        playerNameFormat: '[color={{nameColor}}]{{name}}[/color]',
        accountFormat: '({{account}})',
        timeFormat: '{{time}}',
        docSeparator: '[b]{{name}}[/b]\n',
        chunkSeparator: '[b]{{name}}[/b]\n',
        imageTemplate: '[img]{{imageUrl}}[/img]',
        messageTemplate:
            '[color=silver]{{time}}[/color]{{name}}\n[color={{contentColor}}]{{content}}[/color]',
        messageSeparator: '\n\n',
    },
    {
        formatId: 'echoWorkshop',
        formatName: '回声工坊格式',
        fileExtension: '.txt',
        playerNameFormat: '[{{name}}]',
        accountFormat: '',
        timeFormat: '',
        docSeparator: '--- {{name}} ---',
        chunkSeparator: '',
        imageTemplate: '{{name}}:[图片：{{imageName}}]',
        messageTemplate: '{{name}}:{{content}}',
        messageSeparator: '\n',
    },
    {
        formatId: 'magic',
        formatName: '神人格式',
        fileExtension: '.ts',
        playerNameFormat: '{{name}}',
        accountFormat: '{{account}}',
        timeFormat: 't_{{time}}',
        docSeparator: '// === MODULE: {{name}} ===\n',
        chunkSeparator: '/** @scene {{name}} */\n',
        imageTemplate: 'let {{imageName}} = "{{imageUrl}}"',
        messageTemplate:
            'const {{time}} = ({{account}}: {{name}}) => {\n  return `{{content}}`;\n};',
        messageSeparator: '\n',
    },
];

export const useExportStore = defineStore('export', {
    state: () => {
        const storedFormats = localStorage.getItem('app_export_formats');
        const storedActiveId = localStorage.getItem('app_export_active_id');
        const formats: ExportFormat[] = storedFormats
            ? JSON.parse(storedFormats)
            : PRESETS.map((preset) => ({ ...preset }));

        // 保留已有编辑，只同步更新有关图片的新配置
        for (const preset of PRESETS) {
            if (
                !formats.some((format) => format.formatId === preset.formatId)
            ) {
                formats.push({ ...preset });
            }
        }

        return {
            formats: formats.map(normalizeExportFormat),
            activeFormatId: storedActiveId || 'standard',
        };
    },
    getters: {
        activeFormat(state): ExportFormat {
            return (
                state.formats.find(
                    (f: ExportFormat) => f.formatId === state.activeFormatId,
                ) || state.formats[0]
            );
        },
        formatById(state) {
            return (id: string): ExportFormat | undefined =>
                state.formats.find((f: ExportFormat) => f.formatId === id);
        },
    },
    actions: {
        createFormat() {
            const newFmt: ExportFormat = {
                formatId: generateId(),
                formatName: '未命名模板',
                fileExtension: '.txt',
                playerNameFormat: '{{name}}',
                accountFormat: '{{account}}',
                timeFormat: '{{time}}',
                docSeparator: '',
                chunkSeparator: '',
                imageTemplate: DEFAULT_IMAGE_TEMPLATE,
                messageTemplate: '{{name}}: {{content}}',
                messageSeparator: '\n',
            };
            this.formats.push(newFmt);
            this.saveToLocal();
            return newFmt;
        },

        setActive(id: string) {
            this.activeFormatId = id;
            this.saveToLocal();
        },
        saveFormat(format: ExportFormat) {
            const index = this.formats.findIndex(
                (f: ExportFormat) => f.formatId === format.formatId,
            );
            if (index > -1) {
                this.formats[index] = normalizeExportFormat(format);
            } else {
                this.formats.push(normalizeExportFormat(format));
            }
            this.saveToLocal();
        },
        deleteFormat(id: string) {
            if (
                EXPORT_PRESET_IDS.includes(
                    id as (typeof EXPORT_PRESET_IDS)[number],
                )
            )
                return;
            this.formats = this.formats.filter(
                (f: ExportFormat) => f.formatId !== id,
            );
            if (this.activeFormatId === id) {
                this.activeFormatId = 'standard';
            }
            this.saveToLocal();
        },
        saveToLocal() {
            localStorage.setItem(
                'app_export_formats',
                JSON.stringify(this.formats),
            );
            localStorage.setItem('app_export_active_id', this.activeFormatId);
        },
    },
});
