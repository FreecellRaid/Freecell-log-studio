<template>
    <div
        v-if="mobileStore.activeSheet"
        class="mobile-sheet-backdrop"
        @click.self="mobileStore.closeSheet"
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
                    @click="mobileStore.closeSheet"
                >
                    <X class="ui-icon" />
                </button>
            </header>

            <div
                v-if="
                    mobileStore.activeSheet === 'message' &&
                    mobileStore.editingMessage
                "
                class="mobile-form"
            >
                <MessageDetailEditor
                    :message="mobileStore.editingMessage"
                    :values="mobileStore.messageDraft"
                    :show-meta="false"
                    :content-rows="7"
                    @text-input="updateMessageDraftText"
                    @commit-text="commitMessageDraftText"
                    @field-change="updateMessageDraftField"
                />
            </div>

            <div
                v-else-if="mobileStore.activeSheet === 'projectName'"
                class="mobile-form"
            >
                <label class="mobile-field">
                    <span>项目名</span>
                    <input
                        :value="mobileStore.projectNameDraft"
                        type="text"
                        @input="
                            mobileStore.projectNameDraft = getInputValue($event)
                        "
                        @blur="commitProjectName"
                        @keydown.enter.exact.prevent="commitProjectName()"
                    />
                </label>
            </div>

            <div
                v-else-if="mobileStore.activeSheet === 'chunkName'"
                class="mobile-form"
            >
                <label class="mobile-field">
                    <span>场景名</span>
                    <input
                        :value="mobileStore.chunkNameDraft"
                        type="text"
                        @input="
                            mobileStore.chunkNameDraft = getInputValue($event)
                        "
                        @blur="commitChunkName"
                        @keydown.enter.exact.prevent="commitChunkName"
                    />
                </label>
            </div>

            <div
                v-else-if="mobileStore.activeSheet === 'storedProjects'"
                class="mobile-stored-projects"
            >
                <StoredProjectsPopover
                    :projects="mobileStore.storedProjects"
                    @refresh="refreshStoredProjects"
                    @close="mobileStore.closeSheet"
                />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { X } from '@lucide/vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useProjectManager } from '@/composables/useProjectManager';
import { useSwipeGesture } from '@/composables/useSwipeGesture';

const MessageDetailEditor = defineAsyncComponent(
    () => import('@/components/common/MessageDetailEditor.vue'),
);
const StoredProjectsPopover = defineAsyncComponent(
    () => import('@/components/popovers/StoredProjectsPopover.vue'),
);

const mobileStore = useMobileEditorStore();
const logStore = useLogStore();
const editorStore = useLogEditorStore();
const projectManager = useProjectManager();
const closeGesture = useSwipeGesture({
    direction: 'down',
    canStart: (event) => {
        const target = event.target;
        const sheet =
            target instanceof Element ? target.closest('.mobile-sheet') : null;
        return !(sheet instanceof HTMLElement) || sheet.scrollTop === 0;
    },
    onSwipe: mobileStore.closeSheet,
});

const title = computed(() => {
    switch (mobileStore.activeSheet) {
        case 'message':
            return '编辑消息';
        case 'projectName':
            return '项目名';
        case 'chunkName':
            return '场景名';
        case 'storedProjects':
            return '本地快照';
        default:
            return '';
    }
});

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement).value;
}

function updateMessageDraftText(field: MessageDetailTextField, value: string) {
    mobileStore.updateMessageDraftText(field, value);
}

function commitMessageDraftText(field: MessageDetailTextField) {
    if (!mobileStore.editingMessage) return;
    editorStore.updateMessage(
        mobileStore.editingMessage.chunkId,
        mobileStore.editingMessage.messageId,
        {
            [field]: mobileStore.messageDraft[field],
        },
    );
}

function updateMessageDraftField<K extends keyof MessageDetailValues>(
    field: K,
    value: MessageDetailValues[K],
) {
    mobileStore.updateMessageDraftField(field, value);
    if (!mobileStore.editingMessage) return;
    editorStore.updateMessage(
        mobileStore.editingMessage.chunkId,
        mobileStore.editingMessage.messageId,
        {
            [field]: value,
        },
    );
}

function commitProjectName() {
    logStore.setProjectName(mobileStore.projectNameDraft);
}

function commitChunkName() {
    if (!mobileStore.editingChunkId) return;
    editorStore.updateChunk(mobileStore.editingChunkId, {
        chunkName: mobileStore.chunkNameDraft.trim() || '未命名场景',
    });
}

function refreshStoredProjects() {
    mobileStore.setStoredProjects(projectManager.getStoredProjects());
}
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
