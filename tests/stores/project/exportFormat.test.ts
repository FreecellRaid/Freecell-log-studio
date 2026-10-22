import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useExportStore, PRESETS } from '@/stores/io/exportStore';
describe('图片模板兼容', () => {
    const storage = new Map<string, string>();
    beforeEach(() => {
        storage.clear();
        setActivePinia(createPinia());
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        });
    });
    afterEach(() => vi.unstubAllGlobals());
    it('旧用户模板与已编辑预设补齐图片字段，保留原有布局和默认选择', () => {
        const { imageTemplate: _unused, ...legacy } = PRESETS[0]!;
        storage.set(
            'app_export_formats',
            JSON.stringify([
                { ...legacy, messageTemplate: '用户布局' },
                {
                    ...legacy,
                    formatId: 'custom',
                    formatName: '自定义',
                    imageTemplate: '【附件】',
                },
            ]),
        );
        storage.set('app_export_active_id', 'custom');
        const store = useExportStore();
        expect(store.formatById(legacy.formatId)).toMatchObject({
            messageTemplate: '用户布局',
            imageTemplate: '{{image}}',
        });
        expect(store.activeFormat.imageTemplate).toBe('【附件】');
        store.saveToLocal();
        expect(
            JSON.parse(storage.get('app_export_formats')!).every(
                (format: { imageTemplate?: string }) =>
                    typeof format.imageTemplate === 'string',
            ),
        ).toBe(true);
    });
    it('新模板默认包含图片 token，并保存自定义空模板', () => {
        const store = useExportStore();
        const format = store.createFormat();
        expect(format.imageTemplate).toBe('{{image}}');
        store.saveFormat({ ...format, imageTemplate: '' });
        expect(store.formatById(format.formatId)?.imageTemplate).toBe('');
    });
});
