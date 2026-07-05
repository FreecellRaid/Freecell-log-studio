import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import type {
    MessageDetailTextField,
    MessageDetailValues,
} from '@/components/common/MessageDetailEditor.vue';
import type { Chunk, Message } from '@/types/log';
import type { MobileBottomPanelName, MobileSheetName } from '@/types/mobile';
import type { ProjectFile } from '@/types/project';

function createEmptyMessageDraft(): MessageDetailValues {
    return {
        playerName: '',
        account: '',
        role: 'unknown',
        content: '',
        note: '',
        isOoc: false,
        isCommand: false,
    };
}

export const useMobileEditorStore = defineStore('mobileEditor', () => {
    const activeBottomPanel = ref<MobileBottomPanelName | null>(null);
    const activeSheet = ref<MobileSheetName>(null);
    const leftDrawerOpen = ref(false);
    const selectedMessageId = ref<string | null>(null);
    const editingMessage = ref<Message | null>(null);
    const editingChunkId = ref<string | null>(null);
    const storedProjects = ref<ProjectFile[]>([]);
    const projectNameDraft = ref('');
    const chunkNameDraft = ref('');
    const messageDraft = reactive<MessageDetailValues>(
        createEmptyMessageDraft(),
    );

    function openLeftDrawer() {
        leftDrawerOpen.value = true;
    }

    function closeLeftDrawer() {
        leftDrawerOpen.value = false;
    }

    function openBottomPanel(panelName: MobileBottomPanelName) {
        activeBottomPanel.value = panelName;
    }

    function toggleBottomPanel(panelName: MobileBottomPanelName) {
        activeBottomPanel.value =
            activeBottomPanel.value === panelName ? null : panelName;
    }

    function closeBottomPanel() {
        activeBottomPanel.value = null;
    }

    function openSheet(sheetName: Exclude<MobileSheetName, null>) {
        activeSheet.value = sheetName;
    }

    function closeSheet() {
        activeSheet.value = null;
        editingMessage.value = null;
        editingChunkId.value = null;
    }

    function selectMessage(messageId: string) {
        selectedMessageId.value =
            selectedMessageId.value === messageId ? null : messageId;
    }

    function setEditingMessage(message: Message) {
        editingMessage.value = message;
        Object.assign(messageDraft, {
            playerName: message.playerName,
            account: message.account,
            role: message.role,
            content: message.content,
            note: message.note,
            isOoc: message.isOoc,
            isCommand: message.isCommand,
        });
        openSheet('message');
    }

    function updateMessageDraftText(
        field: MessageDetailTextField,
        value: string,
    ) {
        messageDraft[field] = value;
    }

    function updateMessageDraftField<K extends keyof MessageDetailValues>(
        field: K,
        value: MessageDetailValues[K],
    ) {
        messageDraft[field] = value;
    }

    function startProjectNameEdit(projectName: string) {
        projectNameDraft.value = projectName;
        openSheet('projectName');
    }

    function startChunkRename(chunk: Chunk) {
        editingChunkId.value = chunk.chunkId;
        chunkNameDraft.value = chunk.chunkName;
        openSheet('chunkName');
    }

    function setStoredProjects(projects: ProjectFile[]) {
        storedProjects.value = projects;
    }

    function openStoredProjects(projects: ProjectFile[]) {
        setStoredProjects(projects);
        openSheet('storedProjects');
    }

    function resetAfterClear() {
        activeBottomPanel.value = null;
        leftDrawerOpen.value = false;
        selectedMessageId.value = null;
        closeSheet();
    }

    return {
        activeBottomPanel,
        activeSheet,
        leftDrawerOpen,
        selectedMessageId,
        editingMessage,
        editingChunkId,
        storedProjects,
        projectNameDraft,
        chunkNameDraft,
        messageDraft,

        openLeftDrawer,
        closeLeftDrawer,
        openBottomPanel,
        toggleBottomPanel,
        closeBottomPanel,
        openSheet,
        closeSheet,
        selectMessage,
        setEditingMessage,
        updateMessageDraftText,
        updateMessageDraftField,
        startProjectNameEdit,
        startChunkRename,
        setStoredProjects,
        openStoredProjects,
        resetAfterClear,
    };
});
