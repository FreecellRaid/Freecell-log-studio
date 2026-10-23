import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
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

export const useExportStore = defineStore('export', () => {
    const formats = useLocalStorage<ExportFormat[]>(
        'app_export_formats',
        () => PRESETS.map((preset) => ({ ...preset })),
        { flush: 'sync', window: globalThis.window },
    );
    const activeFormatId = useLocalStorage('app_export_active_id', 'standard', {
        flush: 'sync',
        window: globalThis.window,
    });

    // 保留已有编辑，但内置预设的图片模板始终同步到当前版本。
    for (const preset of PRESETS) {
        const existingFormat = formats.value.find(
            (format) => format.formatId === preset.formatId,
        );
        if (existingFormat) {
            existingFormat.imageTemplate = preset.imageTemplate;
        } else {
            formats.value.push({ ...preset });
        }
    }
    formats.value = formats.value.map(normalizeExportFormat);

    const activeFormat = computed(
        () =>
            formats.value.find(
                (format) => format.formatId === activeFormatId.value,
            ) || formats.value[0],
    );

    function createFormat() {
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
        formats.value.push(newFmt);
        return newFmt;
    }

    function setActive(id: string) {
        activeFormatId.value = id;
    }

    function saveFormat(format: ExportFormat) {
        const index = formats.value.findIndex(
            (existing) => existing.formatId === format.formatId,
        );
        if (index > -1) {
            formats.value[index] = normalizeExportFormat(format);
        } else {
            formats.value.push(normalizeExportFormat(format));
        }
    }

    function deleteFormat(id: string) {
        if (
            EXPORT_PRESET_IDS.includes(id as (typeof EXPORT_PRESET_IDS)[number])
        )
            return;
        formats.value = formats.value.filter(
            (format) => format.formatId !== id,
        );
        if (activeFormatId.value === id) {
            activeFormatId.value = 'standard';
        }
    }

    function formatById(id: string) {
        return formats.value.find((format) => format.formatId === id);
    }

    return {
        formats,
        activeFormatId,
        activeFormat,
        formatById,
        createFormat,
        setActive,
        saveFormat,
        deleteFormat,
    };
});
