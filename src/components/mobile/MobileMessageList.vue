<template>
    <template v-if="activeChunk">
        <section class="mobile-editor-header">
            <h4>{{ activeChunk.chunkName || '未命名场景' }}</h4>
            <p>{{ messages.length }} 条消息</p>
            <button
                class="mobile-icon-button"
                type="button"
                title="重命名场景"
                @click="$emit('renameChunk')"
            >
                <Pencil class="ui-icon" />
            </button>
        </section>

        <section>
            <article
                v-for="(message, index) in messages"
                :key="message.messageId"
                class="mobile-message"
                :class="{
                    'is-selected':
                        mobileStore.selectedMessageId === message.messageId,
                }"
                @click="mobileStore.selectMessage(message.messageId)"
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

                <p
                    class="mobile-message-content"
                    :style="getMessageStyle(message).contentStyle"
                >
                    {{ message.content || '空消息' }}
                </p>

                <footer class="mobile-message-tags">
                    <span v-if="message.isOoc">场外</span>
                    <span v-if="message.isCommand">指令</span>
                    <span v-if="message.note">{{ message.note }}</span>
                </footer>

                <div
                    v-if="mobileStore.selectedMessageId === message.messageId"
                    class="mobile-message-actions"
                >
                    <button
                        class="mobile-action-button"
                        type="button"
                        @click.stop="$emit('editMessage', message)"
                    >
                        编辑
                    </button>
                    <button
                        class="mobile-action-button"
                        type="button"
                        @click.stop="$emit('insertAfter', message, index)"
                    >
                        插入
                    </button>
                    <button
                        class="mobile-action-button"
                        type="button"
                        @click.stop="$emit('mergeWithNext', message.messageId)"
                    >
                        合并
                    </button>
                    <button
                        class="mobile-action-button is-warning"
                        type="button"
                        @click.stop="$emit('deleteMessage', message.messageId)"
                    >
                        删除
                    </button>
                </div>
            </article>
        </section>
    </template>
</template>

<script setup lang="ts">
import { Pencil } from '@lucide/vue';
import { computeStyleForMessage } from '@/editor/styleEngine';
import { useStyleStore } from '@/stores/styleStore';
import { useUiStore } from '@/stores/uiStore';
import { useMobileEditorStore } from '@/stores/mobileEditorStore';
import type { Chunk, Message } from '@/types/log';
import { formatDate } from '@/utils/date';

defineProps<{
    activeChunk: Chunk | null;
    messages: Message[];
}>();

defineEmits<{
    (e: 'renameChunk'): void;
    (e: 'editMessage', message: Message): void;
    (e: 'insertAfter', message: Message, index: number): void;
    (e: 'mergeWithNext', messageId: string): void;
    (e: 'deleteMessage', messageId: string): void;
}>();

const uiStore = useUiStore();
const styleStore = useStyleStore();
const mobileStore = useMobileEditorStore();

function getMessageStyle(message: Message) {
    return computeStyleForMessage(message, styleStore.activeRules);
}
</script>

<style scoped>
.mobile-editor-header {
    min-height: 50px;
    padding: 0px 12px 0px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-workspace);
    position: sticky;
    top: -1px;
    z-index: 1;
}

.mobile-editor-header h4 {
    margin: 0;
    line-height: 1.25;
}

.mobile-editor-header p {
    margin: 3px 0 0;
    font-size: 12px;
    color: var(--text-secondary);
}

.mobile-icon-button {
    width: 40px;
    height: 40px;
    border: 0;
    margin-left: auto;
    background: transparent;
    color: var(--icon-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.mobile-icon-button .ui-icon {
    width: 18px;
    height: 18px;
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
    border: 1px solid var(--border-color);
    background: var(--bg-sidebar);
    color: var(--text-primary);
    padding: 0 14px;
    border-radius: 8px;
}

.mobile-action-button.is-warning {
    color: var(--color-warning);
}
</style>
