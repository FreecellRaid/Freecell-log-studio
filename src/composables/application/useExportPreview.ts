import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { renderExportDocument } from '@/io/export/exportRender';
import { flattenLogToRows } from '@/io/export/flattener';
import { useExportStore } from '@/stores/io/exportStore';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';

export function useExportPreview(formatId: MaybeRefOrGetter<string>) {
    const exportStore = useExportStore();
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    // 预览始终绑定实例的模板，不回退到其他活动模板。
    const activeFormat = computed(() =>
        exportStore.formatById(toValue(formatId)),
    );
    const rowsWithId = computed(() => {
        if (!activeFormat.value) return [];
        const rows = flattenLogToRows(
            logStore.documents,
            styleStore.viewSettings,
            styleStore.activeRules,
        );
        return renderExportDocument(rows, activeFormat.value).blocks.map(
            (block, index) => ({
                ...block,
                rowId: `${block.type}-${index}`,
            }),
        );
    });
    const enableMarkdown = computed(
        () => styleStore.viewSettings.enableMarkdown,
    );
    return { activeFormat, rowsWithId, enableMarkdown };
}
