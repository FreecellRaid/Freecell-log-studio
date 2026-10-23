import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useExportStore, PRESETS } from '@/stores/io/exportStore';
describe('图片模板兼容', () => {
    const storage = new Map<string, string>();
    beforeEach(() => {
        storage.clear();
        setActivePinia(createPinia());
        class TestStorage {
            getItem(key: string) {
                return storage.get(key) ?? null;
            }
            setItem(key: string, value: string) {
                storage.set(key, value);
            }
            removeItem(key: string) {
                storage.delete(key);
            }
        }
        vi.stubGlobal('Storage', TestStorage);
        vi.stubGlobal('StorageEvent', class TestStorageEvent {});
        const localStorage = new TestStorage();
        vi.stubGlobal('localStorage', localStorage);
        vi.stubGlobal('window', {
            localStorage,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        });
    });
    afterEach(() => vi.unstubAllGlobals());
    it('旧用户模板与已编辑预设同步图片模板，保留原有布局和默认选择', () => {
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
        store.setActive('custom');
        expect(store.formatById(legacy.formatId)).toMatchObject({
            messageTemplate: '用户布局',
            imageTemplate: PRESETS[0]!.imageTemplate,
        });
        expect(store.activeFormat.imageTemplate).toBe('【附件】');
        expect(
            JSON.parse(storage.get('app_export_formats')!).every(
                (format: { imageTemplate?: string }) =>
                    typeof format.imageTemplate === 'string',
            ),
        ).toBe(true);
        expect(storage.get('app_export_active_id')).toBe('custom');
    });
    it('更新已有内置预设的图片模板，同时保留其他编辑', () => {
        const preset = PRESETS[0]!;
        storage.set(
            'app_export_formats',
            JSON.stringify([
                {
                    ...preset,
                    imageTemplate: '旧版图片模板',
                    messageTemplate: '用户布局',
                },
                {
                    ...preset,
                    formatId: 'custom',
                    imageTemplate: '自定义图片模板',
                },
            ]),
        );

        const store = useExportStore();
        expect(store.formatById(preset.formatId)).toMatchObject({
            imageTemplate: preset.imageTemplate,
            messageTemplate: '用户布局',
        });
        expect(store.formatById('custom')?.imageTemplate).toBe(
            '自定义图片模板',
        );
    });
    it('新模板默认包含图片 token，并保存自定义空模板', () => {
        const store = useExportStore();
        const format = store.createFormat();
        expect(format.imageTemplate).toBe('{{image}}');
        store.saveFormat({ ...format, imageTemplate: '' });
        expect(store.formatById(format.formatId)?.imageTemplate).toBe('');
    });
});
