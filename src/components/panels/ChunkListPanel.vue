<template>
    <div class="panel" @pointerdown="windowStore.setFocus('chunkList')">
        <div class="panel-header">
            <div class="header-title">
                <input
                    v-if="isEditingProjectName"
                    ref="projectNameInputRef"
                    v-model="projectNameDraft"
                    class="project-name-input"
                    type="text"
                    placeholder="未命名工程"
                    v-click-outside="() => submitProjectName()"
                    @keydown.enter.exact.prevent="submitProjectName"
                    @keydown.esc.prevent="resetProjectNameDraft"
                />
                <template v-else>
                    <h3 title="双击重命名工程" @dblclick="startProjectNameEdit">
                        {{ logStore.projectName || '未命名工程' }}
                    </h3>
                </template>
            </div>
            <button
                class="header-action-button"
                title="新建文档"
                @click="handleCreateDocument"
            >
                <Plus class="ui-icon" />
            </button>
        </div>

        <div ref="scrollContainerRef" class="chunk-list-scroll">
            <template
                v-for="(doc, docIndex) in logStore.documents"
                :key="doc.docId"
            >
                <div
                    class="document-drop-zone"
                    :class="{
                        'is-active':
                            documentDropIndex === docIndex &&
                            documentDrag.isDragging.value,
                    }"
                    @dragover="handleDocumentDragOver($event, docIndex)"
                    @drop="handleDocumentDrop($event, docIndex)"
                ></div>
                <div class="document-group">
                    <div
                        class="doc-header"
                        :draggable="!isRenamingDocument(doc)"
                        @click="handleToggleExpand(doc)"
                        @dragstart="handleDocumentDragStart($event, doc.docId)"
                        @dragover="
                            handleDocHeaderDragOver(
                                $event,
                                doc.docId,
                                doc.chunks.length,
                            )
                        "
                        @drop="
                            handleChunkDrop(
                                $event,
                                doc.docId,
                                doc.chunks.length,
                            )
                        "
                        @dragend="handleDocumentDragEnd"
                    >
                        <span
                            class="expand-icon"
                            :class="{ 'is-expanded': doc.isExpanded }"
                        >
                            <ChevronRight class="ui-icon" />
                        </span>

                        <input
                            v-if="isRenamingDocument(doc)"
                            ref="renameInputRef"
                            v-model="renameDraft"
                            class="rename-input doc-name"
                            type="text"
                            @click.stop
                            @dblclick.stop
                            v-click-outside="
                                () => submitRename('document', doc.docId)
                            "
                            @keydown.enter.exact.prevent="
                                submitRename('document', doc.docId)
                            "
                            @keydown.esc.prevent="cancelRename"
                        />
                        <span
                            v-else
                            class="doc-name"
                            @dblclick.stop="
                                startRename('document', doc.docId, doc.docName)
                            "
                        >
                            {{ doc.docName }}
                        </span>
                        <span class="doc-count">({{ doc.chunks.length }})</span>

                        <div class="doc-actions">
                            <button
                                v-if="doc.chunks.length === 0"
                                class="action-button"
                                title="新建场景"
                                @click.stop="handleCreateChunk(doc.docId, 0)"
                            >
                                <Plus class="ui-icon" />
                            </button>
                            <button
                                class="action-button action-button-warning icon-interactive is-warning"
                                title="移除文档"
                                @click.stop="handleRemoveDoc(doc.docId)"
                            >
                                <Trash2 class="ui-icon" />
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="doc.isExpanded"
                        class="chunk-items-container"
                        :class="{
                            'is-drop-at-start':
                                dropIndicator.docId === doc.docId &&
                                dropIndicator.index === 0 &&
                                chunkDrag.isDragging.value,
                        }"
                        @dragover.self="
                            handleChunkDragOver($event, doc.docId, 0)
                        "
                        @drop.self="handleChunkDrop($event, doc.docId, 0)"
                    >
                        <div
                            v-for="(chunk, chunkIndex) in doc.chunks"
                            :key="chunk.chunkId"
                            class="chunk-slot"
                            :class="{
                                'is-drop-target':
                                    dropIndicator.docId === doc.docId &&
                                    dropIndicator.index === chunkIndex + 1 &&
                                    chunkDrag.isDragging.value,
                            }"
                        >
                            <div
                                class="chunk-item"
                                :class="{
                                    // 对自身的焦点判断
                                    'is-active':
                                        windowStore.currentActiveWindow
                                            .windowId === 'chunkList',
                                    // 对view的焦点判断
                                    'is-active-chunk':
                                        windowStore.currentActiveView
                                            .originalId === chunk.chunkId,
                                    // 选中判断
                                    'is-selected':
                                        activeContext.selectedChunkIds.value.has(
                                            chunk.chunkId,
                                        ),
                                }"
                                :draggable="!isRenamingChunk(chunk)"
                                @click="
                                    handleChunkSelect(chunk.chunkId, $event)
                                "
                                @dragstart="
                                    handleChunkDragStart($event, chunk.chunkId)
                                "
                                @dragover="
                                    handleChunkDragOver(
                                        $event,
                                        doc.docId,
                                        chunkIndex + 1,
                                    )
                                "
                                @drop="
                                    handleChunkDrop(
                                        $event,
                                        doc.docId,
                                        chunkIndex + 1,
                                    )
                                "
                                @dragend="handleChunkDragEnd"
                            >
                                <input
                                    v-if="isRenamingChunk(chunk)"
                                    ref="renameInputRef"
                                    v-model="renameDraft"
                                    class="rename-input chunk-name"
                                    type="text"
                                    @click.stop
                                    @dblclick.stop
                                    v-click-outside="
                                        () =>
                                            submitRename('chunk', chunk.chunkId)
                                    "
                                    @keydown.enter.exact.prevent="
                                        submitRename('chunk', chunk.chunkId)
                                    "
                                    @keydown.esc.prevent="cancelRename"
                                />
                                <span
                                    v-else
                                    class="chunk-name"
                                    @dblclick.stop="
                                        startRename(
                                            'chunk',
                                            chunk.chunkId,
                                            chunk.chunkName,
                                        )
                                    "
                                >
                                    {{ chunk.chunkName || '未命名分块' }}
                                </span>

                                <div class="chunk-actions">
                                    <button
                                        v-if="
                                            chunkIndex < doc.chunks.length - 1
                                        "
                                        class="action-button"
                                        title="向下合并"
                                        @click.stop="
                                            handleMerge(
                                                chunk.chunkId,
                                                doc.chunks[chunkIndex + 1]
                                                    .chunkId,
                                            )
                                        "
                                    >
                                        <ChevronsDown class="ui-icon" />
                                    </button>
                                    <button
                                        class="action-button"
                                        title="在下方新建场景"
                                        @click.stop="
                                            handleCreateChunk(
                                                doc.docId,
                                                chunkIndex + 1,
                                            )
                                        "
                                    >
                                        <Plus class="ui-icon" />
                                    </button>

                                    <button
                                        class="action-button action-button-warning"
                                        title="删除分块"
                                        @click.stop="
                                            handleDelete(chunk.chunkId)
                                        "
                                    >
                                        <Trash2 class="ui-icon" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <div
                class="document-drop-zone"
                :class="{
                    'is-active':
                        documentDropIndex === logStore.documents.length &&
                        documentDrag.isDragging.value,
                }"
                @dragover="
                    handleDocumentDragOver($event, logStore.documents.length)
                "
                @drop="handleDocumentDrop($event, logStore.documents.length)"
            ></div>

            <div
                v-if="logStore.documents.length === 0"
                class="panel-empty-hint"
            >
                暂无数据，点击右上角或拖入文件进行导入
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ChevronRight, ChevronsDown, Plus, Trash2 } from '@lucide/vue';
import { nextTick, reactive, ref, watch } from 'vue';
import {
    useChunkDragDrop,
    useDocumentDragDrop,
} from '@/composables/interaction/useDragDrop';
import { useLogCommands } from '@/stores/project/logCommands';
import { useLogStore } from '@/stores/project/logStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import type { Chunk, LogDocument } from '@/types/log';
import { useActiveContext } from '@/composables/application/useActiveContext';
import { vClickOutside } from '@/directives/clickOutside';

const logStore = useLogStore();
const windowStore = useWindowStore();
const logCommands = useLogCommands();
const editorSessionStore = useEditorSessionStore();
const chunkDrag = useChunkDragDrop();
const documentDrag = useDocumentDragDrop();
const activeContext = useActiveContext('chunkList');

const renameTarget = ref<{ kind: 'document' | 'chunk'; id: string } | null>(
    null,
);
const renameDraft = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);
const projectNameDraft = ref('');
const isEditingProjectName = ref(false);
const projectNameInputRef = ref<HTMLInputElement | null>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);
const documentDropIndex = ref<number | null>(null);

const dropIndicator = reactive<{ docId: string; index: number | null }>({
    docId: '',
    index: null,
});

watch(
    () => logStore.projectName,
    (nextProjectName) => {
        projectNameDraft.value = nextProjectName;
    },
    { immediate: true },
);

function startProjectNameEdit() {
    editorSessionStore.startEditing({ kind: 'projectName' });
    projectNameDraft.value = logStore.projectName;
    isEditingProjectName.value = true;
    nextTick(() => {
        projectNameInputRef.value?.focus();
        projectNameInputRef.value?.select();
    });
}

function submitProjectName() {
    logStore.setProjectName(projectNameDraft.value.trim());
    projectNameDraft.value = logStore.projectName;
    isEditingProjectName.value = false;
    editorSessionStore.stopEditing();
}

function resetProjectNameDraft() {
    projectNameDraft.value = logStore.projectName;
    isEditingProjectName.value = false;
    editorSessionStore.stopEditing();
}

function handleToggleExpand(doc: LogDocument) {
    logCommands.setDocumentExpanded(doc.docId, !doc.isExpanded);
}

function handleRemoveDoc(docId: string) {
    if (confirm('确定要删除这个文档及其所有消息吗？这不会删除原始文件。')) {
        logCommands.deleteDocument(docId);
    }
}

function handleCreateDocument() {
    const docId = logCommands.createDocument();
    startRename('document', docId, '未命名文档');
}

function handleCreateChunk(docId: string, insertIndex: number) {
    const chunkId = logCommands.createChunk(docId, '未命名场景', insertIndex);
    if (chunkId) {
        startRename('chunk', chunkId, '未命名场景');
    }
}

function focusRenameInput() {
    nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
    });
}

function cancelRename() {
    renameTarget.value = null;
    renameDraft.value = '';
    editorSessionStore.stopEditing();
}

function startRename(kind: 'document' | 'chunk', id: string, name: string) {
    renameTarget.value = { kind, id };
    renameDraft.value = name;
    if (kind === 'chunk') {
        editorSessionStore.startEditing({ kind: 'chunkName', chunkId: id });
    }
    focusRenameInput();
}

function submitRename(kind: 'document' | 'chunk', id: string) {
    if (
        !renameTarget.value ||
        renameTarget.value.kind !== kind ||
        renameTarget.value.id !== id
    ) {
        return;
    }

    const nextName = renameDraft.value.trim();
    if (!nextName) {
        cancelRename();
        return;
    }

    if (kind === 'document') {
        logCommands.renameDocument(id, nextName);
    } else {
        logCommands.updateChunk(id, { chunkName: nextName });
    }

    cancelRename();
}

function isRenamingDocument(doc: LogDocument) {
    return (
        renameTarget.value?.kind === 'document' &&
        renameTarget.value.id === doc.docId
    );
}

function isRenamingChunk(chunk: Chunk) {
    return (
        renameTarget.value?.kind === 'chunk' &&
        renameTarget.value.id === chunk.chunkId
    );
}

function handleMerge(currentChunkId: string, nextChunkId: string) {
    withScrollAnchor(() => {
        logCommands.mergeChunks([currentChunkId, nextChunkId]);
    });
}

function handleChunkSelect(chunkId: string, event: MouseEvent) {
    activeContext.handleChunkClickSelection(event, chunkId);

    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (windowStore.hasSplitView) {
            const activePaneIndex = windowStore.getActivePaneIndex();
            windowStore.setPaneView(activePaneIndex, 'chunkView', chunkId);
        } else {
            // 单窗口模式，直接使用 setActiveChunk 切换视图
            windowStore.setActiveChunk(chunkId);
        }
        windowStore.setFocus('chunkList');
    }
}

function handleDelete(chunkId: string) {
    const { selectedChunkIds, clearSelection } = activeContext;

    const targets = selectedChunkIds.value.has(chunkId)
        ? Array.from(selectedChunkIds.value)
        : [chunkId];

    const isMultiple = targets.length > 1;
    if (
        confirm(
            isMultiple
                ? `确定要删除选中的 ${targets.length} 个场景及其所有消息吗？`
                : '确定要删除这个场景，及其所有消息吗？',
        )
    ) {
        targets.forEach((id) => {
            logCommands.deleteChunk(id);
            if (windowStore.isWindowOpen(id)) {
                windowStore.unregisterWindow(id);
            }
        });

        if (selectedChunkIds.value.has(chunkId)) {
            clearSelection();
        }
    }
}

function setDropIndicator(docId: string, index: number) {
    dropIndicator.docId = docId;
    dropIndicator.index = index;
}

function clearDropIndicator() {
    dropIndicator.docId = '';
    dropIndicator.index = null;
}

function handleChunkDragStart(event: DragEvent, chunkId: string) {
    event.stopPropagation();
    clearDropIndicator();
    chunkDrag.onDragStart(event, chunkId);
}

function handleChunkDragOver(event: DragEvent, docId: string, index: number) {
    setDropIndicator(docId, index);
    chunkDrag.onDragOver(event);
}

function handleDocHeaderDragOver(
    event: DragEvent,
    docId: string,
    index: number,
) {
    if (documentDrag.isDragging.value) return;
    setDropIndicator(docId, index);
    chunkDrag.onDragOver(event);
}

function handleChunkDrop(event: DragEvent, docId: string, index: number) {
    if (documentDrag.isDragging.value) return;
    clearDropIndicator();
    chunkDrag.onDrop(event, docId, index);
}

function handleChunkDragEnd() {
    clearDropIndicator();
    chunkDrag.onDragEnd();
}

function handleDocumentDragStart(event: DragEvent, docId: string) {
    clearDropIndicator();
    documentDrag.onDragStart(event, docId);
}

function handleDocumentDragOver(event: DragEvent, index: number) {
    if (!documentDrag.isDragging.value) return;
    documentDropIndex.value = index;
    documentDrag.onDragOver(event);
}

function handleDocumentDrop(event: DragEvent, index: number) {
    if (!documentDrag.isDragging.value) return;
    documentDropIndex.value = null;
    documentDrag.onDrop(event, index);
}

function handleDocumentDragEnd() {
    documentDropIndex.value = null;
    documentDrag.onDragEnd();
}

function captureScrollAnchor() {
    const container = scrollContainerRef.value;
    if (!container) return null;

    return {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
    };
}

async function restoreScrollAnchor(
    anchor: { scrollTop: number; scrollHeight: number } | null,
) {
    if (!anchor) return;

    await nextTick();

    const container = scrollContainerRef.value;
    if (!container) return;

    const heightDelta = container.scrollHeight - anchor.scrollHeight;
    container.scrollTop = Math.max(0, anchor.scrollTop + heightDelta);
}

function withScrollAnchor(action: () => void) {
    const anchor = captureScrollAnchor();
    action();
    void restoreScrollAnchor(anchor);
}
</script>

<style scoped>
.panel-header {
    height: 42px;
    /* 防止输入框和文字切换时抖动 */
    box-sizing: border-box;
}

.header-action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    padding: 4px;
    color: var(--icon-color);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.header-action-button:hover {
    background: var(--hover-bg);
}

.header-action-button :deep(.ui-icon) {
    width: 16px;
    height: 16px;
}

.project-name-input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 6px 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
}

.project-name-input:focus {
    border-color: var(--active-accent);
}

.chunk-list-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 0;
}

.document-group {
    margin-bottom: 2px;
}

.document-drop-zone {
    height: 4px;
    position: relative;
}

.document-drop-zone.is-active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 1px;
    border-top: 2px solid var(--active-accent);
}

.doc-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    cursor: grab;
    user-select: none;
    font-weight: 600;
    border-bottom: none;
}

.doc-header:active {
    cursor: grabbing;
}

.doc-header:hover {
    background-color: var(--hover-bg);
}

.doc-name {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.doc-count {
    font-size: 11px;
    color: var(--text-muted);
    margin-left: 4px;
}

.chunk-items-container {
    background-color: var(--bg-primary);
    position: relative;
}

.chunk-items-container::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -2px;
    height: 4px;
    pointer-events: auto;
    z-index: 1;
}

.chunk-items-container.is-drop-at-start::before {
    border-top: 2px solid var(--active-accent);
}

.chunk-item {
    display: flex;
    align-items: center;
    padding-top: 6px;
    padding-bottom: 6px;
    padding-left: 26px;
    padding-right: 12px;
    cursor: pointer;
    user-select: none;
}

.chunk-slot {
    position: relative;
}

.chunk-item:hover {
    background: var(--hover-bg);
}

.chunk-item.is-active.is-selected {
    background-color: var(--selection-bg);
    color: var(--active-accent);
}

.chunk-item.is-selected:not(.is-active) {
    background-color: var(--inactive-selection-bg);
}

.chunk-item.is-active-chunk {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}

.chunk-name {
    flex: 1;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: 4px;
}

.rename-input {
    width: 100px;
    padding: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--active-accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    outline: none;
}

.chunk-slot.is-drop-target::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 1px;
    border-top: 2px solid var(--active-accent);
    pointer-events: none;
    z-index: 1;
}

.chunk-actions,
.doc-actions {
    display: none;
    align-items: center;
    gap: 4px;
}

.chunk-item:hover .chunk-actions,
.doc-header:hover .doc-actions {
    display: flex;
}

.action-button {
    background: none;
    border: none;
    padding: 0px 2px;
    cursor: pointer;
    color: var(--icon-color);
    opacity: 0.7;
}

.action-button:hover {
    background-color: none;
    opacity: 1;
}

.action-button :deep(.ui-icon) {
    width: 14px;
    height: 14px;
}

.action-button-warning:hover,
.action-button-warning:focus-visible {
    color: var(--color-warning);
}
</style>
