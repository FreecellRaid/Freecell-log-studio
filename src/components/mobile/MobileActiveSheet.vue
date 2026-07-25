<template>
    <div
        v-if="mobileUiStore.activeSheet"
        class="mobile-sheet-backdrop"
        @click.self="closeSheet"
        @touchstart="closeGesture.onTouchStart"
        @touchend="closeGesture.onTouchEnd"
        @touchcancel="closeGesture.onTouchCancel"
    >
        <section class="mobile-sheet">
            <header class="mobile-drawer-header">
                <h2>{{ title }}</h2>
                <button
                    class="mobile-icon-button"
                    type="button"
                    title="关闭"
                    @click="closeSheet"
                >
                    <X class="ui-icon" />
                </button>
            </header>

            <div
                v-if="mobileUiStore.activeSheet === 'message' && editingMessage"
                class="mobile-form"
            >
                <MessageDetailEditor
                    :message="editingMessage"
                    :values="messageDraft"
                    :show-meta="false"
                    :content-rows="7"
                    @text-input="updateMessageDraftText"
                    @commit-text="commitMessageDraftText"
                    @field-change="updateMessageDraftField"
                />
            </div>

            <div
                v-else-if="mobileUiStore.activeSheet === 'projectName'"
                class="mobile-form"
            >
                <label class="mobile-field">
                    <span>项目名</span>
                    <input
                        :value="projectNameDraft"
                        type="text"
                        @input="projectNameDraft = getInputValue($event)"
                        @blur="commitProjectName"
                        @keydown.enter.exact.prevent="commitProjectName()"
                    />
                </label>
            </div>

            <div
                v-else-if="mobileUiStore.activeSheet === 'chunkName'"
                class="mobile-form"
            >
                <label class="mobile-field">
                    <span>场景名</span>
                    <input
                        :value="chunkNameDraft"
                        type="text"
                        @input="chunkNameDraft = getInputValue($event)"
                        @blur="commitChunkName"
                        @keydown.enter.exact.prevent="commitChunkName"
                    />
                </label>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, reactive, ref, watch } from 'vue';
import { X } from '@lucide/vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useMobileUiStore } from '@/stores/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editorSessionStore';
import { useSwipeGesture } from '@/composables/interaction/useSwipeGesture';

const MessageDetailEditor = defineAsyncComponent(
    () => import('@/components/common/MessageDetailEditor.vue'),
);

const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();
const logStore = useLogStore();
const editorStore = useLogEditorStore();
const editingMessage = computed(() => {
    const target = editorSessionStore.activeTarget;
    if (target?.kind !== 'message') return null;
    return logStore.messagesById.get(target.messageId) ?? null;
});
const messageDraft = reactive<MessageDetailValues>({
    playerName: editingMessage.value?.playerName ?? '',
    account: editingMessage.value?.account ?? '',
    role: editingMessage.value?.role ?? 'unknown',
    content: editingMessage.value?.content ?? '',
    note: editingMessage.value?.note ?? '',
    isOoc: editingMessage.value?.isOoc ?? false,
    isCommand: editingMessage.value?.isCommand ?? false,
});
const projectNameDraft = ref(logStore.projectName);
const chunkNameDraft = ref(
    editorSessionStore.activeTarget?.kind === 'chunkName'
        ? (logStore.findChunkById(editorSessionStore.activeTarget.chunkId)
              ?.chunkName ?? '')
        : '',
);
const closeGesture = useSwipeGesture({
    direction: 'down',
    canStart: (event) => {
        const target = event.target;
        const sheet =
            target instanceof Element ? target.closest('.mobile-sheet') : null;
        return !(sheet instanceof HTMLElement) || sheet.scrollTop === 0;
    },
    onSwipe: closeSheet,
});

const title = computed(() => {
    switch (mobileUiStore.activeSheet) {
        case 'message':
            return '编辑消息';
        case 'projectName':
            return '项目名';
        case 'chunkName':
            return '场景名';
        default:
            return '';
    }
});

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement).value;
}

function updateMessageDraftText(field: MessageDetailTextField, value: string) {
    messageDraft[field] = value;
}

function commitMessageDraftText(field: MessageDetailTextField) {
    const target = editorSessionStore.activeTarget;
    if (target?.kind !== 'message') return;
    editorStore.updateMessage(target.chunkId, target.messageId, {
        [field]: messageDraft[field],
    });
}

function updateMessageDraftField<K extends keyof MessageDetailValues>(
    field: K,
    value: MessageDetailValues[K],
) {
    messageDraft[field] = value;
    const target = editorSessionStore.activeTarget;
    if (target?.kind !== 'message') return;
    editorStore.updateMessage(target.chunkId, target.messageId, {
        [field]: value,
    });
}

function commitProjectName() {
    logStore.setProjectName(projectNameDraft.value);
}

function commitChunkName() {
    const target = editorSessionStore.activeTarget;
    if (target?.kind !== 'chunkName') return;
    editorStore.updateChunk(target.chunkId, {
        chunkName: chunkNameDraft.value.trim() || '未命名场景',
    });
}

function closeSheet() {
    mobileUiStore.closeOverlay();
    editorSessionStore.stopEditing();
}

watch(
    () => editorSessionStore.activeTarget,
    (target) => {
        if (!target) {
            mobileUiStore.closeOverlay();
        }
    },
);
</script>

<style scoped>
.mobile-sheet-backdrop {
    align-items: flex-end;
}

.mobile-sheet {
    width: 100%;
    max-height: min(78dvh, 720px);
    overflow-y: auto;
    background: var(--bg-workspace);
    border-radius: 12px 12px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -8px 30px var(--box-shadow);
}
</style>
