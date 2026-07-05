<template>
    <div
        v-if="mobileStore.activeSheet"
        class="mobile-sheet-backdrop"
        @click.self="mobileStore.closeSheet"
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
                            mobileStore.projectNameDraft =
                                getInputValue($event)
                        "
                        @blur="commitProjectName"
                        @keydown.enter.exact.prevent="
                            commitProjectName()
                        "
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
import { computed } from 'vue';
import { X } from '@lucide/vue';
import MessageDetailEditor from '@/components/common/MessageDetailEditor.vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import StoredProjectsPopover from '@/components/popovers/StoredProjectsPopover.vue';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import { useProjectManager } from '@/composables/useProjectManager';

const mobileStore = useMobileEditorStore();
const logStore = useLogStore();
const editorStore = useLogEditorStore();
const projectManager = useProjectManager();

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

function updateMessageDraftText(
    field: MessageDetailTextField,
    value: string,
) {
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
    position: fixed;
    inset: 0;
    background: var(--box-shadow);
    z-index: 90;
    display: flex;
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

.mobile-drawer-header {
    min-height: 50px;
    padding: 0 8px 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-color);
}

.mobile-drawer-header h2 {
    margin: 0;
    font-size: 16px;
}

.mobile-icon-button {
    width: 42px;
    height: 42px;
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mobile-icon-button .ui-icon {
    width: 20px;
    height: 20px;
}

.mobile-form,
.mobile-stored-projects {
    padding: 12px;
}

.mobile-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-secondary);
}

.mobile-field input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-color);
    background: var(--bg-workspace);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 12px;
    font: inherit;
}
</style>
