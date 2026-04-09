import { defineStore } from 'pinia';
import type { ExportFormat } from '@/types/export';
import { generateId } from '@/utils/id';

const PRESETS: ExportFormat[] = [
    {
        formatId: 'magic',
        formatName: '神人格式',
        fileExtension: '.ts',
        playerNameFormat: '{{name}}',
        accountFormat: '{{account}}',
        timeFormat: 't_{{time}}',
        docSeparator: '// === MODULE: {{name}} ===',
        chunkSeparator: '/** @scene {{name}} */',
        messageTemplate:
            'const {{time}} = ({{account}}: {{name}}) => {\n  return `{{content}}`;\n};',
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
        docSeparator: '# {{name}}',
        chunkSeparator: '## {{name}}',
        messageTemplate: '{{name}} {{account}} {{time}}\n\n> {{content}}',
        messageSeparator: '\n\n---\n\n',
    },
    {
        formatId: 'classicTrpgLog',
        formatName: '经典染色器格式',
        fileExtension: '.docx',
        playerNameFormat: '<{{name}}>:',
        accountFormat: '({{account}})',
        timeFormat: '{{time}}',
        docSeparator: '=== {{name}} ===',
        chunkSeparator: '\n',
        messageTemplate: '{{time}}{{name}} {{account}} {{content}}',
        messageSeparator: '\n',
    },
    {
        formatId: 'hangingIndent',
        formatName: '悬挂缩进格式',
        fileExtension: '.docx',
        playerNameFormat: '{{name}}',
        accountFormat: '',
        timeFormat: '',
        docSeparator: '=== {{name}} ===',
        chunkSeparator: '--- {{name}} ---',
        messageTemplate: '{{name}} \t {{content}}',
        messageSeparator: '\n',
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
        messageTemplate: '{{name}}:{{content}}',
        messageSeparator: '\n',
    },
];

export const useExportStore = defineStore('export', {
    state: () => {
        const storedFormats = localStorage.getItem('app_export_formats');
        const storedActiveId = localStorage.getItem('app_export_active_id');

        return {
            formats: storedFormats ? JSON.parse(storedFormats) : [...PRESETS],
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
                this.formats[index] = { ...format };
            } else {
                this.formats.push({ ...format });
            }
            this.saveToLocal();
        },
        deleteFormat(id: string) {
            if (id === 'standard' || id === 'magic') return;
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
