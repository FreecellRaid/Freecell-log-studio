<template>
    <div class="mobile-editor">
        <HelpDocument v-if="windowStore.isHelpOpen" />

        <input
            :ref="setFileInput"
            type="file"
            accept=".txt,.json,application/json"
            multiple
            hidden
            @change="handleFileChange"
        />
        <MobileTopBar
            :project-name="logStore.projectName"
            :total-messages="logStore.totalMessages"
            @menu="leftDrawerOpen = true"
            @import="triggerImport"
        />

        <main class="mobile-main">
            <div v-if="!activeChunk" class="mobile-empty">
                <MessagesSquare class="mobile-empty-icon" />
                <p>选择一个场景开始编辑</p>
                <button
                    class="mobile-primary-button"
                    type="button"
                    @click="openBottomDrawer('chunkList')"
                >
                    打开场景列表
                </button>
            </div>

            <MobileMessageList
                v-else
                :active-chunk="activeChunk"
                :messages="visibleMessages"
                :selected-message-id="selectedMessageId"
                @rename-chunk="startChunkRename"
                @select-message="selectMessage"
                @edit-message="startMessageEdit"
                @insert-after="insertAfter"
                @merge-with-next="mergeWithNext"
                @delete-message="deleteMessage"
            />
        </main>

        <MobileHistoryFloat />

        <nav class="mobile-panel-dock">
            <button
                v-for="item in bottomPanels"
                :key="item.name"
                type="button"
                :class="{ 'is-active': activeBottomPanel === item.name }"
                @click="toggleBottomDrawer(item.name)"
            >
                <component :is="item.icon" class="ui-icon" />
                <span>{{ item.label }}</span>
            </button>
        </nav>

        <MobileBottomPanelDrawer
            v-if="activeBottomPanel"
            :active-panel="activeBottomPanel"
            :title="bottomDrawerTitle"
            @close="closeBottomDrawer"
        />

        <MobileLeftDrawer
            v-if="leftDrawerOpen"
            :has-workspace-state="workspaceActions.hasWorkspaceState.value"
            @close="leftDrawerOpen = false"
            @edit-project-name="startProjectNameEdit"
            @save-project="handleSaveProject"
            @show-stored-projects="showStoredProjects"
            @clear-all="handleClearAll"
        />

        <div
            v-if="activeSheet"
            class="mobile-sheet-backdrop"
            @click.self="closeSheet"
        >
            <section class="mobile-sheet">
                <header class="mobile-drawer-header">
                    <h2>{{ sheetTitle }}</h2>
                    <button
                        class="mobile-icon-button"
                        type="button"
                        title="关闭"
                        @click="closeSheet"
                    >
                        <X class="ui-icon" />
                    </button>
                </header>

                <form
                    v-if="activeSheet === 'message' && editingMessage"
                    class="mobile-form"
                    @submit.prevent="submitMessageEdit"
                >
                    <label class="mobile-field">
                        <span>玩家名</span>
                        <input v-model="messageDraft.playerName" type="text" />
                    </label>
                    <label class="mobile-field">
                        <span>账号</span>
                        <input v-model="messageDraft.account" type="text" />
                    </label>
                    <label class="mobile-field">
                        <span>身份</span>
                        <select v-model="messageDraft.role">
                            <option value="pl">玩家</option>
                            <option value="gm">主持人</option>
                            <option value="npc">NPC</option>
                            <option value="ob">观众</option>
                            <option value="bot">骰子</option>
                            <option value="unknown">未知</option>
                        </select>
                    </label>
                    <label class="mobile-field">
                        <span>消息内容</span>
                        <textarea v-model="messageDraft.content" rows="7" />
                    </label>
                    <label class="mobile-field">
                        <span>备注</span>
                        <input v-model="messageDraft.note" type="text" />
                    </label>
                    <label class="mobile-toggle">
                        <span>场外消息</span>
                        <input v-model="messageDraft.isOoc" type="checkbox" />
                    </label>
                    <label class="mobile-toggle">
                        <span>指令消息</span>
                        <input v-model="messageDraft.isCommand" type="checkbox" />
                    </label>
                    <div class="mobile-form-actions">
                        <button class="mobile-primary-button" type="submit">
                            保存
                        </button>
                        <button
                            class="mobile-secondary-button"
                            type="button"
                            @click="closeSheet"
                        >
                            取消
                        </button>
                    </div>
                </form>

                <form
                    v-else-if="activeSheet === 'projectName'"
                    class="mobile-form"
                    @submit.prevent="submitProjectName"
                >
                    <label class="mobile-field">
                        <span>项目名</span>
                        <input v-model="projectNameDraft" type="text" />
                    </label>
                    <button class="mobile-primary-button" type="submit">
                        保存
                    </button>
                </form>

                <form
                    v-else-if="activeSheet === 'chunkName' && activeChunk"
                    class="mobile-form"
                    @submit.prevent="submitChunkRename"
                >
                    <label class="mobile-field">
                        <span>场景名</span>
                        <input v-model="chunkNameDraft" type="text" />
                    </label>
                    <button class="mobile-primary-button" type="submit">
                        保存
                    </button>
                </form>

                <div
                    v-else-if="activeSheet === 'storedProjects'"
                    class="mobile-stored-projects"
                >
                    <StoredProjectsPopover
                        :projects="storedProjects"
                        @refresh="refreshStoredProjects"
                        @close="closeSheet"
                    />
                </div>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
    FolderOpen,
    MessagesSquare,
    Palette,
    Search,
    TextInitial,
    UserRound,
    X,
} from '@lucide/vue';
import HelpDocument from '@/components/common/HelpDocument.vue';
import StoredProjectsPopover from '@/components/popovers/StoredProjectsPopover.vue';
import MobileBottomPanelDrawer from '@/components/mobile/MobileBottomPanelDrawer.vue';
import MobileHistoryFloat from '@/components/mobile/MobileHistoryFloat.vue';
import MobileLeftDrawer from '@/components/mobile/MobileLeftDrawer.vue';
import MobileMessageList from '@/components/mobile/MobileMessageList.vue';
import MobileTopBar from '@/components/mobile/MobileTopBar.vue';
import { useFileImportInput } from '@/composables/useImporter';
import { useProjectManager } from '@/composables/useProjectManager';
import { useWorkspaceActions } from '@/composables/useWorkspaceActions';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Chunk, Message, RoleType } from '@/types/log';
import type { MobileBottomPanelName, MobileSheetName } from '@/types/mobile';
import type { ProjectFile } from '@/types/project';

const bottomPanels: Array<{
    name: MobileBottomPanelName;
    label: string;
    icon: typeof FolderOpen;
}> = [
    { name: 'chunkList', label: '场景', icon: FolderOpen },
    { name: 'identity', label: '身份', icon: UserRound },
    { name: 'ruleEditor', label: '染色', icon: Palette },
    { name: 'search', label: '搜索', icon: Search },
    { name: 'exportFormat', label: '模板', icon: TextInitial },
];

const bottomPanelTitles: Record<MobileBottomPanelName, string> = {
    chunkList: '场景列表',
    identity: '身份管理',
    ruleEditor: '染色规则',
    search: '搜索过滤',
    exportFormat: '导出模板',
};

const logStore = useLogStore();
const uiStore = useUiStore();
const styleStore = useStyleStore();
const windowStore = useWindowStore();
const editorStore = useLogEditorStore();
const projectManager = useProjectManager();
const workspaceActions = useWorkspaceActions();

const { setFileInput, triggerImport, handleFileChange } = useFileImportInput();
const activeBottomPanel = ref<MobileBottomPanelName | null>(null);
const activeSheet = ref<MobileSheetName>(null);
const leftDrawerOpen = ref(false);
const selectedMessageId = ref<string | null>(null);
const editingMessage = ref<Message | null>(null);
const storedProjects = ref<ProjectFile[]>([]);
const projectNameDraft = ref('');
const chunkNameDraft = ref('');

const messageDraft = reactive<{
    playerName: string;
    account: string;
    role: RoleType;
    content: string;
    note: string;
    isOoc: boolean;
    isCommand: boolean;
}>({
    playerName: '',
    account: '',
    role: 'unknown',
    content: '',
    note: '',
    isOoc: false,
    isCommand: false,
});

const activeChunk = computed<Chunk | null>(() => {
    const currentView = windowStore.currentActiveView;
    if (currentView.windowName === 'chunkView') {
        return logStore.findChunkById(currentView.originalId);
    }

    return logStore.allChunks[0] ?? null;
});

const visibleMessages = computed(() => {
    if (!activeChunk.value) return [];
    if (uiStore.showHidden) return activeChunk.value.messages;

    const { hideOoc, hideCommand } = styleStore.viewSettings;
    return activeChunk.value.messages.filter((message) => {
        return !(
            (hideOoc && message.isOoc) ||
            (hideCommand && message.isCommand)
        );
    });
});

const bottomDrawerTitle = computed(() => {
    return activeBottomPanel.value
        ? bottomPanelTitles[activeBottomPanel.value]
        : '';
});

const sheetTitle = computed(() => {
    switch (activeSheet.value) {
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

function openBottomDrawer(panelName: MobileBottomPanelName) {
    activeBottomPanel.value = panelName;
    windowStore.setLeftPanel(panelName);
}

function toggleBottomDrawer(panelName: MobileBottomPanelName) {
    if (activeBottomPanel.value === panelName) {
        closeBottomDrawer();
        return;
    }
    openBottomDrawer(panelName);
}

function closeBottomDrawer() {
    activeBottomPanel.value = null;
}

function closeSheet() {
    activeSheet.value = null;
    editingMessage.value = null;
}

function selectMessage(messageId: string) {
    selectedMessageId.value =
        selectedMessageId.value === messageId ? null : messageId;
}

function startMessageEdit(message: Message) {
    editingMessage.value = message;
    messageDraft.playerName = message.playerName;
    messageDraft.account = message.account;
    messageDraft.role = message.role;
    messageDraft.content = message.content;
    messageDraft.note = message.note;
    messageDraft.isOoc = message.isOoc;
    messageDraft.isCommand = message.isCommand;
    activeSheet.value = 'message';
}

function submitMessageEdit() {
    if (!editingMessage.value) return;
    editorStore.updateMessage(
        editingMessage.value.chunkId,
        editingMessage.value.messageId,
        {
            playerName: messageDraft.playerName,
            account: messageDraft.account,
            role: messageDraft.role,
            content: messageDraft.content,
            note: messageDraft.note,
            isOoc: messageDraft.isOoc,
            isCommand: messageDraft.isCommand,
        },
    );
    closeSheet();
}

function insertAfter(message: Message, index: number) {
    if (!activeChunk.value) return;
    editorStore.insertNewMessageAfter(activeChunk.value.chunkId, message, index);
}

function mergeWithNext(messageId: string) {
    if (!activeChunk.value) return;
    editorStore.mergeWithNextMessage(activeChunk.value.chunkId, messageId);
}

function deleteMessage(messageId: string) {
    if (!activeChunk.value) return;
    if (!window.confirm('确定要删除这条消息吗？')) return;
    editorStore.deleteMessage(activeChunk.value.chunkId, messageId);
    if (selectedMessageId.value === messageId) {
        selectedMessageId.value = null;
    }
}

function startProjectNameEdit() {
    projectNameDraft.value = logStore.projectName;
    activeSheet.value = 'projectName';
}

function submitProjectName() {
    logStore.setProjectName(projectNameDraft.value);
    closeSheet();
}

function startChunkRename() {
    if (!activeChunk.value) return;
    chunkNameDraft.value = activeChunk.value.chunkName;
    activeSheet.value = 'chunkName';
}

function submitChunkRename() {
    if (!activeChunk.value) return;
    editorStore.updateChunk(activeChunk.value.chunkId, {
        chunkName: chunkNameDraft.value.trim() || '未命名场景',
    });
    closeSheet();
}

function handleSaveProject() {
    workspaceActions.saveCurrentProjectWithFeedback();
}

function showStoredProjects() {
    refreshStoredProjects();
    activeSheet.value = 'storedProjects';
}

function refreshStoredProjects() {
    storedProjects.value = projectManager.getStoredProjects();
}

function handleClearAll() {
    workspaceActions.clearWorkspaceWithConfirmation({
        focusTarget: 'defaultView',
        afterClear: () => {
            activeBottomPanel.value = null;
            leftDrawerOpen.value = false;
        },
    });
}
</script>

<style scoped>
.mobile-editor {
    width: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--text-primary);
    background: var(--bg-workspace);
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

.mobile-main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(58px + env(safe-area-inset-bottom));
}

.mobile-empty {
    min-height: 100%;
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
    color: var(--text-secondary);
}

.mobile-empty-icon {
    width: 56px;
    height: 56px;
    color: var(--icon-color);
}

.mobile-panel-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    height: calc(58px + env(safe-area-inset-bottom));
    padding: 0 4px env(safe-area-inset-bottom);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border-top: 1px solid var(--border-color);
    background: var(--bg-topbar);
}

.mobile-panel-dock button {
    border: 0;
    background: transparent;
    color: var(--icon-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 11px;
}

.mobile-panel-dock button.is-active {
    color: var(--active-accent);
}

.mobile-panel-dock .ui-icon {
    width: 20px;
    height: 20px;
}

.mobile-sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 90;
}

.mobile-sheet-backdrop {
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

.mobile-form,
.mobile-stored-projects {
    padding: 12px;
}

.mobile-primary-button,
.mobile-secondary-button {
    min-height: 40px;
    border: 1px solid var(--border-color);
    background: var(--bg-sidebar);
    color: var(--text-primary);
    padding: 0 14px;
    border-radius: 8px;
}

.mobile-primary-button {
    background: var(--active-accent);
    border-color: var(--active-accent);
    color: #ffffff;
}

.mobile-secondary-button {
    width: 100%;
}

.mobile-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--text-secondary);
}

.mobile-field input,
.mobile-field textarea,
.mobile-field select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border-color);
    background: var(--bg-workspace);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 12px;
    font: inherit;
}

.mobile-field textarea {
    resize: vertical;
    min-height: 140px;
}

.mobile-toggle {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-primary);
}

.mobile-toggle input {
    width: 22px;
    height: 22px;
}

.mobile-form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
</style>
