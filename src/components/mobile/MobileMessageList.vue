<template>
    <template v-if="activeChunk">
        <section class="mobile-editor-header">
            <div>
                <h1>{{ activeChunk.chunkName || '未命名场景' }}</h1>
                <p>{{ messages.length }} 条消息</p>
            </div>
            <button
                class="mobile-icon-button"
                type="button"
                title="重命名场景"
                @click="$emit('renameChunk')"
            >
                <Pencil class="ui-icon" />
            </button>
        </section>

        <section class="mobile-message-list">
            <article
                v-for="(message, index) in messages"
                :key="message.messageId"
                class="mobile-message"
                :class="{
                    'is-selected': selectedMessageId === message.messageId,
                }"
                @click="$emit('selectMessage', message.messageId)"
            >
                <header class="mobile-message-header">
                    <strong :style="getMessageStyle(message).nameStyle">
                        {{ message.playerName || '未知角色' }}
                    </strong>
                    <span v-if="uiStore.showAccount && message.account">
                        {{ message.account }}
                    </span>
                    <time v-if="uiStore.showTime">
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

                <div class="mobile-message-actions">
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
import type { Chunk, Message } from '@/types/log';
import { formatDate } from '@/utils/date';

defineProps<{
    activeChunk: Chunk | null;
    messages: Message[];
    selectedMessageId: string | null;
}>();

defineEmits<{
    (e: 'renameChunk'): void;
    (e: 'selectMessage', messageId: string): void;
    (e: 'editMessage', message: Message): void;
    (e: 'insertAfter', message: Message, index: number): void;
    (e: 'mergeWithNext', messageId: string): void;
    (e: 'deleteMessage', messageId: string): void;
}>();

const uiStore = useUiStore();
const styleStore = useStyleStore();

function getMessageStyle(message: Message) {
    return computeStyleForMessage(message, styleStore.activeRules);
}
</script>

<style scoped>
.mobile-editor-header {
    min-height: 58px;
    padding: 10px 12px 10px 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-workspace);
    position: sticky;
    top: 0;
    z-index: 1;
}

.mobile-editor-header h1 {
    margin: 0;
    font-size: 17px;
    line-height: 1.25;
}

.mobile-editor-header p {
    margin: 3px 0 0;
    font-size: 12px;
    color: var(--text-secondary);
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

.mobile-message-list {
    padding: 12px;
}

.mobile-message {
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-workspace);
    margin-bottom: 10px;
}

.mobile-message.is-selected {
    border-color: var(--active-accent);
    background: var(--selection-bg);
}

.mobile-message-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
}

.mobile-message-header strong {
    color: var(--text-primary);
    font-size: 14px;
}

.mobile-message-header time {
    margin-left: auto;
    white-space: nowrap;
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
    min-height: 40px;
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
