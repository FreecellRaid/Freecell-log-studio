<template>
    <div class="mobile-sheet-backdrop" @click.self="$emit('close')">
        <section class="mobile-sheet">
            <header class="mobile-drawer-header">
                <h2>{{ title }}</h2>
                <button
                    class="mobile-icon-button"
                    type="button"
                    title="关闭"
                    @click="$emit('close')"
                >
                    <X class="ui-icon" />
                </button>
            </header>

            <div
                v-if="activeSheet === 'message' && editingMessage"
                class="mobile-form"
            >
                <MessageDetailEditor
                    :message="editingMessage"
                    :values="messageDraft"
                    :show-meta="false"
                    :content-rows="7"
                    @text-input="
                        (field, value) =>
                            $emit('messageTextInput', field, value)
                    "
                    @commit-text="(field) => $emit('messageTextCommit', field)"
                    @field-change="
                        (field, value) =>
                            $emit('messageFieldChange', field, value)
                    "
                />
            </div>

            <div v-else-if="activeSheet === 'projectName'" class="mobile-form">
                <label class="mobile-field">
                    <span>项目名</span>
                    <input
                        :value="projectNameDraft"
                        type="text"
                        @input="
                            $emit(
                                'update:projectNameDraft',
                                getInputValue($event),
                            )
                        "
                        @blur="$emit('commitProjectName')"
                        @keydown.enter.exact.prevent="
                            $emit('commitProjectName')
                        "
                    />
                </label>
            </div>

            <div v-else-if="activeSheet === 'chunkName'" class="mobile-form">
                <label class="mobile-field">
                    <span>场景名</span>
                    <input
                        :value="chunkNameDraft"
                        type="text"
                        @input="
                            $emit(
                                'update:chunkNameDraft',
                                getInputValue($event),
                            )
                        "
                        @blur="$emit('commitChunkName')"
                        @keydown.enter.exact.prevent="$emit('commitChunkName')"
                    />
                </label>
            </div>

            <div
                v-else-if="activeSheet === 'storedProjects'"
                class="mobile-stored-projects"
            >
                <StoredProjectsPopover
                    :projects="storedProjects"
                    @refresh="$emit('refreshStoredProjects')"
                    @close="$emit('close')"
                />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue';
import MessageDetailEditor from '@/components/common/MessageDetailEditor.vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import StoredProjectsPopover from '@/components/popovers/StoredProjectsPopover.vue';
import type { Message } from '@/types/log';
import type { MobileSheetName } from '@/types/mobile';
import type { ProjectFile } from '@/types/project';

defineProps<{
    activeSheet: MobileSheetName;
    title: string;
    editingMessage: Message | null;
    messageDraft: MessageDetailValues;
    projectNameDraft: string;
    chunkNameDraft: string;
    storedProjects: ProjectFile[];
}>();

defineEmits<{
    (e: 'close'): void;
    (e: 'messageTextInput', field: MessageDetailTextField, value: string): void;
    (e: 'messageTextCommit', field: MessageDetailTextField): void;
    <K extends keyof MessageDetailValues>(
        e: 'messageFieldChange',
        field: K,
        value: MessageDetailValues[K],
    ): void;
    (e: 'update:projectNameDraft', value: string): void;
    (e: 'update:chunkNameDraft', value: string): void;
    (e: 'commitProjectName'): void;
    (e: 'commitChunkName'): void;
    (e: 'refreshStoredProjects'): void;
}>();

function getInputValue(event: Event) {
    return (event.target as HTMLInputElement).value;
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
