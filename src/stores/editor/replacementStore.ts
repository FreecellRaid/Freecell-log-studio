import { useDialogStore } from '@/stores/ui/dialogStore';
import { computed, reactive, ref, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';
import type { LogDocument } from '@/types/log';
import { planReplacement, type ReplacementOptions } from '@/editor/replacement';
import { useLogStore } from '@/stores/project/logStore';
import { useLogCommands } from '@/stores/project/logCommands';

export const useReplacementStore = defineStore('replacement', () => {
    const log = useLogStore();
    const editorDialogs = useDialogStore();
    const commands = useLogCommands();
    const targetIds = ref<string[]>([]);
    const source = ref<'search' | 'scene'>('scene');
    const options = reactive<ReplacementOptions>({
        field: 'content',
        mode: 'text',
        find: '',
        replacement: '',
    });
    const originalProject = ref('');
    const originalDocuments = shallowRef<LogDocument[] | null>(null);
    const feedback = ref('');
    watch(
        options,
        () => {
            feedback.value = '';
        },
        { flush: 'sync' },
    );
    const stale = computed(
        () =>
            originalProject.value !== log.projectId ||
            originalDocuments.value !== log.documents,
    );
    const messages = computed(() =>
        stale.value
            ? []
            : targetIds.value.flatMap((id) => {
                  const message = log.messagesById.get(id);
                  return message ? [message] : [];
              }),
    );
    const changes = computed(() => planReplacement(messages.value, options));
    const occurrences = computed(() =>
        changes.value.reduce((sum, change) => sum + change.occurrences, 0),
    );

    function open(
        ids: string[],
        from: 'search' | 'scene',
        defaults: { content: string; note: string },
    ) {
        targetIds.value = [...new Set(ids)];
        source.value = from;
        originalProject.value = log.projectId;
        originalDocuments.value = log.documents;
        options.field = !defaults.content && defaults.note ? 'note' : 'content';
        options.mode = 'text';
        options.find = defaults[options.field];
        options.replacement = '';
        feedback.value = '';
        editorDialogs.open('replace');
    }

    function reset() {
        targetIds.value = [];
        originalDocuments.value = null;
    }

    function clearInputs() {
        options.find = '';
        options.replacement = '';
        feedback.value = '';
    }

    function apply() {
        if (stale.value || !changes.value.length) return;
        const result = commands.replaceMessageText(new Set(targetIds.value), {
            ...options,
        });
        feedback.value = `已修改 ${result.messages} 条消息、${result.occurrences} 处。`;
    }

    return {
        targetIds,
        source,
        options,
        stale,
        messages,
        changes,
        occurrences,
        feedback,
        clearInputs,
        open,
        apply,
        reset,
    };
});
