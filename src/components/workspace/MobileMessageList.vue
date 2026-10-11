<template>
    <section ref="listRef" class="mobile-message-list">
        <div v-if="messages.length === 0" class="view-empty-hint">
            {{
                chunk.messages.length
                    ? '当前筛选下没有可见消息。'
                    : '该场景目前没有任何消息。'
            }}
        </div>
        <article
            v-for="message in messages"
            :key="message.messageId"
            class="mobile-message"
            :data-message-id="message.messageId"
            :class="{
                'is-selected': activeContext.selectedMessageIds.value.has(
                    message.messageId,
                ),
            }"
            @click="toggleMessageSelection(message.messageId)"
        >
            <header class="mobile-message-header">
                <strong
                    class="mobile-message-name"
                    :style="getMessageStyle(message).nameStyle"
                >
                    {{ message.playerName || '未知角色' }}
                </strong>
                <span
                    v-if="uiStore.showAccount && message.account"
                    class="mobile-message-account"
                >
                    {{ message.account }}
                </span>
                <time v-if="uiStore.showTime" class="mobile-message-time">
                    {{ formatDate(message.time) }}
                </time>
            </header>

            <div
                class="mobile-message-content"
                :style="getMessageStyle(message).contentStyle"
            >
                <MarkdownContent
                    :content="message.content || '空消息'"
                    :enabled="styleStore.viewSettings.enableMarkdown"
                />
            </div>

            <footer class="mobile-message-tags">
                <span v-if="message.isOoc">场外</span>
                <span v-if="message.isCommand">指令</span>
                <span v-if="message.note">{{ message.note }}</span>
            </footer>

            <div
                v-if="
                    activeContext.selectedMessageIds.value.has(
                        message.messageId,
                    )
                "
                class="mobile-message-actions"
            >
                <button
                    class="mobile-action-button"
                    type="button"
                    @click.stop="startMessageEdit(message)"
                >
                    编辑
                </button>
                <button
                    class="mobile-action-button"
                    type="button"
                    @click.stop="insertAfter(message)"
                >
                    插入
                </button>
                <button
                    class="mobile-action-button"
                    type="button"
                    @click.stop="mergeWithNext(message.messageId)"
                >
                    合并
                </button>
                <button
                    class="mobile-action-button is-warning"
                    type="button"
                    @click.stop="deleteMessage(message.messageId)"
                >
                    删除
                </button>
            </div>
        </article>
    </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useLogCommands } from '@/stores/project/logCommands';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { computeStyleForMessage } from '@/editor/styleEngine';
import { useStyleStore } from '@/stores/project/styleStore';
import { useUiStore } from '@/stores/ui/uiStore';
import { useMessageReveal } from '@/composables/application/useMessageReveal';
import { useActiveContext } from '@/composables/application/useActiveContext';
import type { Chunk, Message } from '@/types/log';
import { formatDate } from '@/utils/date';
import MarkdownContent from '@/components/common/MarkdownContent.vue';

const props = defineProps<{
    windowId: string;
    chunk: Chunk;
    messages: Message[];
}>();

const uiStore = useUiStore();
const styleStore = useStyleStore();
const activeContext = useActiveContext(() => props.windowId);

const logCommands = useLogCommands();
const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();
const listRef = ref<HTMLElement | null>(null);

useMessageReveal({
    windowId: () => props.windowId,
    messages: () => props.messages,
    ready: () => Boolean(listRef.value),
    reveal: (_index, messageId) => {
        const element = Array.from(
            listRef.value?.querySelectorAll<HTMLElement>('[data-message-id]') ??
                [],
        ).find((item) => item.dataset.messageId === messageId);
        if (!element) return false;
        element.scrollIntoView({ block: 'center' });
        return true;
    },
});

function startMessageEdit(message: Message) {
    editorSessionStore.startEditing(
        {
            kind: 'message',
            chunkId: props.chunk.chunkId,
            messageId: message.messageId,
        },
        props.windowId,
    );
    mobileUiStore.openSheet('message');
}
function insertAfter(message: Message) {
    logCommands.insertNewMessageAfter(props.chunk.chunkId, message);
}
function mergeWithNext(messageId: string) {
    logCommands.mergeWithNextMessage(
        props.chunk.chunkId,
        messageId,
        props.messages.map((message) => message.messageId),
    );
}
function deleteMessage(messageId: string) {
    if (!window.confirm('确定要删除这条消息吗？')) return;
    logCommands.deleteMessage(props.chunk.chunkId, messageId);
    if (activeContext.selectedMessageIds.value.has(messageId))
        activeContext.clearMessageSelection();
}
// 从桌面切换到移动端时，继续展示同一份编辑草稿。
watch(
    () => editorSessionStore.activeTarget,
    (target) => {
        if (
            target?.kind === 'message' &&
            target.chunkId === props.chunk.chunkId
        ) {
            editorSessionStore.startEditing(target, props.windowId);
            mobileUiStore.openSheet('message');
        }
    },
    { immediate: true },
);

function toggleMessageSelection(messageId: string) {
    if (activeContext.selectedMessageIds.value.has(messageId)) {
        activeContext.clearMessageSelection();
        return;
    }
    activeContext.setMessagesSelection([messageId]);
}

function getMessageStyle(message: Message) {
    return computeStyleForMessage(message, styleStore.activeRules);
}
</script>

<style scoped>
.mobile-message-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.mobile-message {
    padding: 12px 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-workspace);
}

.mobile-message.is-selected {
    background: var(--selection-bg);
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}

.mobile-message-header {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(0, 1fr) max-content;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    min-width: 0;
}

.mobile-message-name {
    min-width: 0;
    max-width: 42vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
    font-size: 14px;
}

.mobile-message-account {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobile-message-time {
    max-width: 34vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: right;
}

.mobile-message-header:not(:has(.mobile-message-account)) {
    grid-template-columns: minmax(0, 1fr) max-content;
}

.mobile-message-content {
    margin: 8px 0 0;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
}

.mobile-message-tags,
.mobile-message-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.mobile-message-tags span {
    font-size: 12px;
    color: var(--text-secondary);
}

.mobile-action-button {
    min-height: 36px;
}
</style>
