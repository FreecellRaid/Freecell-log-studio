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
                    @keydown.enter.prevent="submitProjectName"
                    @keydown.esc.prevent="resetProjectNameDraft"
                    @blur="submitProjectName"
                />
                <template v-else>
                    <h3 title="双击重命名工程" @dblclick="startProjectNameEdit">
                        {{ logStore.projectName || '未命名工程' }}
                    </h3>
                </template>
            </div>
        </div>

        <div ref="scrollContainerRef" class="chunk-list-scroll">
            <div
                v-for="doc in logStore.documents"
                :key="doc.docId"
                class="document-group"
            >
                <div
                    class="doc-header"
                    @click="handleToggleExpand(doc)"
                    @dragover="
                        handleDocHeaderDragOver(
                            $event,
                            doc.docId,
                            doc.chunks.length,
                        )
                    "
                    @drop="
                        handleChunkDrop($event, doc.docId, doc.chunks.length)
                    "
                >
                    <span
                        class="expand-icon"
                        :class="{ 'is-expanded': doc.isExpanded }"
                    >
                        <ChevronRight class="ui-icon" />
                    </span>

                    <input
                        v-if="editingDocId === doc.docId"
                        ref="renameInputRef"
                        v-model="renameDraft"
                        class="rename-input doc-name"
                        type="text"
                        @click.stop
                        @dblclick.stop
                        @keydown.enter.prevent="submitDocumentRename(doc)"
                        @keydown.esc.prevent="cancelRename"
                        @blur="submitDocumentRename(doc)"
                    />
                    <span
                        v-else
                        class="doc-name"
                        @dblclick.stop="startDocumentRename(doc)"
                    >
                        {{ doc.docName }}
                    </span>
                    <span class="doc-count">({{ doc.chunks.length }})</span>

                    <div class="doc-actions">
                        <button
                            class="action-button action-button-warning icon-interactive is-warning"
                            title="移除文档"
                            @click.stop="handleRemoveDoc(doc.docId)"
                        >
                            <Trash2 class="ui-icon" />
                        </button>
                    </div>
                </div>

                <div v-if="doc.isExpanded" class="chunk-items-container">
                    <div
                        class="drop-zone"
                        :class="{
                            'is-active':
                                dropIndicator.docId === doc.docId &&
                                dropIndicator.index === 0 &&
                                chunkDrag.isDragging.value,
                        }"
                        @dragover="handleChunkDragOver($event, doc.docId, 0)"
                        @drop="handleChunkDrop($event, doc.docId, 0)"
                    ></div>

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
                                    windowStore.currentActiveWindow.windowId ===
                                    'chunkList',
                                // 对view的焦点判断
                                'is-active-chunk':
                                    windowStore.currentActiveView.originalId ===
                                    chunk.chunkId,
                                // 选中判断
                                'is-selected':
                                    activeContext.selectedChunkIds.value.has(
                                        chunk.chunkId,
                                    ),
                            }"
                            draggable="true"
                            @click="handleChunkSelect(chunk.chunkId, $event)"
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
                                v-if="editingChunkId === chunk.chunkId"
                                ref="renameInputRef"
                                v-model="renameDraft"
                                class="rename-input chunk-name"
                                type="text"
                                @click.stop
                                @dblclick.stop
                                @keydown.enter.prevent="
                                    submitChunkRename(chunk)
                                "
                                @keydown.esc.prevent="cancelRename"
                                @blur="submitChunkRename(chunk)"
                            />
                            <span
                                v-else
                                class="chunk-name"
                                @dblclick.stop="startChunkRename(chunk)"
                            >
                                {{ chunk.chunkName || '未命名分块' }}
                            </span>

                            <div class="chunk-actions">
                                <button
                                    v-if="chunkIndex < doc.chunks.length - 1"
                                    class="action-button"
                                    title="向下合并"
                                    @click.stop="
                                        handleMerge(
                                            chunk.chunkId,
                                            doc.chunks[chunkIndex + 1].chunkId,
                                        )
                                    "
                                >
                                    <ChevronsDown class="ui-icon" />
                                </button>
                                <button
                                    class="action-button action-button-warning"
                                    title="删除分块"
                                    @click.stop="handleDelete(chunk.chunkId)"
                                >
                                    <Trash2 class="ui-icon" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
import { ChevronRight, ChevronsDown, Trash2 } from '@lucide/vue';
import { nextTick, reactive, ref, watch } from 'vue';
import { useChunkDragDrop } from '@/composables/useDragDrop';
import { useLogEditorStore } from '@/stores/editorStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useWindowStore } from '@/stores/windowStore';
import type { Chunk, LogDocument } from '@/types/log';
import { useActiveContext } from '@/composables/useActiveContext';

const logStore = useLogStore();
const styleStore = useStyleStore();
const windowStore = useWindowStore();
const logEditorStore = useLogEditorStore();
const chunkDrag = useChunkDragDrop();
const activeContext = useActiveContext('chunkList');

const editingDocId = ref('');
const editingChunkId = ref('');
const renameDraft = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);
const projectNameDraft = ref('');
const isEditingProjectName = ref(false);
const projectNameInputRef = ref<HTMLInputElement | null>(null);
const scrollContainerRef = ref<HTMLElement | null>(null);

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
}

function resetProjectNameDraft() {
    projectNameDraft.value = logStore.projectName;
    isEditingProjectName.value = false;
}

function handleToggleExpand(doc: LogDocument) {
    logStore.updateDocument(doc.docId, { isExpanded: !doc.isExpanded });
}

function handleRemoveDoc(docId: string) {
    if (confirm('确定要删除这个文档及其所有消息吗？这不会删除原始文件。')) {
        logStore.removeDocument(docId);
        styleStore.syncSystemRulesFromMessages(logStore.allMessages);
    }
}

function focusRenameInput() {
    nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
    });
}

function cancelRename() {
    editingDocId.value = '';
    editingChunkId.value = '';
    renameDraft.value = '';
}

function startDocumentRename(doc: LogDocument) {
    editingChunkId.value = '';
    editingDocId.value = doc.docId;
    renameDraft.value = doc.docName;
    focusRenameInput();
}

function startChunkRename(chunk: Chunk) {
    editingDocId.value = '';
    editingChunkId.value = chunk.chunkId;
    renameDraft.value = chunk.chunkName;
    focusRenameInput();
}

function submitDocumentRename(doc: LogDocument) {
    if (editingDocId.value !== doc.docId) return;

    const nextName = renameDraft.value.trim();
    if (!nextName) {
        cancelRename();
        return;
    }

    logEditorStore.renameDocument(doc.docId, nextName);
    cancelRename();
}

function submitChunkRename(chunk: Chunk) {
    if (editingChunkId.value !== chunk.chunkId) return;

    const nextName = renameDraft.value.trim();
    if (!nextName) {
        cancelRename();
        return;
    }

    logEditorStore.updateChunk(chunk.chunkId, { chunkName: nextName });
    cancelRename();
}

function handleMerge(currentChunkId: string, nextChunkId: string) {
    withScrollAnchor(() => {
        logEditorStore.mergeChunks([currentChunkId, nextChunkId]);
    });
}

function handleChunkSelect(chunkId: string, event: MouseEvent) {
    activeContext.handleChunkClickSelection(event, chunkId);

    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (windowStore.hasSplitView) {
            const activePaneIndex = windowStore.getActivePaneIndex() ?? 0;
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
            logEditorStore.deleteChunk(id);
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
    setDropIndicator(docId, index);
    chunkDrag.onDragOver(event);
}

function handleChunkDrop(event: DragEvent, docId: string, index: number) {
    clearDropIndicator();
    chunkDrag.onDrop(event, docId, index);
}

function handleChunkDragEnd() {
    clearDropIndicator();
    chunkDrag.onDragEnd();
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

.doc-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    border-bottom: none;
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
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
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

.drop-zone {
    height: 4px;
    position: relative;
    transition: background-color 0.2s;
}

.drop-zone:hover {
    background-color: var(--active-accent);
}

.drop-zone.is-active::after,
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
    border-radius: 4px;
    color: var(--icon-color);
    opacity: 0.75;
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
