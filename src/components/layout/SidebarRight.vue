<template>
    <div class="panel">
        <header class="panel-header">
            <div class="title">
                <h3>INSPECTOR</h3>
            </div>
            <div class="count" v-if="selectedItems.length > 0">
                {{ selectedItems.length }} Selected
            </div>
        </header>

        <div class="inspector-content">
            <div v-if="selectedMessageCount === 0" class="empty-state">
                <p>未选中消息</p>
                <p class="sub">在编辑器中点击消息以查看详情</p>
            </div>

            <div v-for="chunk in allChunks" :key="chunk.chunkId">
                <div
                    v-for="message in chunk.messages"
                    :key="message.messageId"
                    v-show="
                        activeContext.selectedMessageIds.value.has(
                            message.messageId,
                        )
                    "
                    class="message-detail-card"
                >
                    <div class="card-header">
                        <span class="id-badge">
                            ID: {{ message.messageId }}
                        </span>
                    </div>

                    <div class="property-grid">
                        <div class="prop-item-time">
                            <label>Time:</label>
                            <div>{{ formatDate(message.time) }}</div>
                        </div>

                        <div class="prop-item">
                            <label>Player Name</label>
                            <input
                                type="text"
                                :value="message.playerName"
                                @input="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'playerName',
                                        $event,
                                    )
                                "
                            />
                        </div>

                        <div class="prop-item">
                            <label>Account</label>
                            <input
                                type="text"
                                :value="message.account"
                                @input="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'account',
                                        $event,
                                    )
                                "
                            />
                        </div>

                        <div class="prop-item">
                            <label>Index (In Chunk)</label>
                            <input
                                type="number"
                                :value="message.messageIndex"
                                @input="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'messageIndex',
                                        $event,
                                        'number',
                                    )
                                "
                            />
                        </div>

                        <div class="prop-item">
                            <label>Role</label>
                            <select
                                :value="message.role"
                                @change="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'role',
                                        $event,
                                    )
                                "
                            >
                                <option value="pl">玩家</option>
                                <option value="gm">主持人</option>
                                <option value="npc">NPC</option>
                                <option value="ob">观众</option>
                                <option value="bot">骰子</option>
                            </select>
                        </div>

                        <div class="prop-row">
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    :checked="message.isOoc"
                                    @change="
                                        updateField(
                                            chunk.chunkId,
                                            message.messageId,
                                            'isOoc',
                                            $event,
                                            'boolean',
                                        )
                                    "
                                />
                                OOC
                            </label>
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    :checked="message.isCommand"
                                    @change="
                                        updateField(
                                            chunk.chunkId,
                                            message.messageId,
                                            'isCommand',
                                            $event,
                                            'boolean',
                                        )
                                    "
                                />
                                Command
                            </label>
                        </div>

                        <div class="prop-item full-width">
                            <label>Content</label>
                            <textarea
                                :value="message.content"
                                @input="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'content',
                                        $event,
                                    )
                                "
                                rows="3"
                            ></textarea>
                        </div>

                        <div class="prop-item full-width">
                            <label>Note</label>
                            <input
                                type="text"
                                :value="message.note"
                                @input="
                                    updateField(
                                        chunk.chunkId,
                                        message.messageId,
                                        'note',
                                        $event,
                                    )
                                "
                                placeholder="备注信息..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useActiveContext } from '@/composables/useActiveContext';
import { useLogStore } from '@/stores/logStore';
import { useLogEditorStore } from '@/stores/editorStore';
import { formatDate } from '@/utils/date';

const activeContext = useActiveContext();
const logStore = useLogStore();
const logEditorStore = useLogEditorStore();
const allChunks = computed(() => logStore.allChunks);

// updateMessage 需要 chunkId 才能准确定位
const selectedItems = computed(() => {
    return logStore.allMessages
        .filter((msg) =>
            activeContext.selectedMessageIds.value.has(msg.messageId),
        )
        .map((msg) => ({
            message: { ...msg },
            chunkId: msg.chunkId,
        }));
});

const selectedMessageCount = computed(
    () => activeContext.selectedMessageIds.value.size,
);

function updateField(
    chunkId: string,
    messageId: string,
    field: string,
    event: Event,
    type: 'string' | 'number' | 'boolean' = 'string',
) {
    const target = event.target as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
    let value: any;

    if (type === 'boolean') {
        value = (target as HTMLInputElement).checked;
    } else if (type === 'number') {
        value = parseInt(target.value, 10) || 0;
    } else {
        value = target.value;
    }

    logEditorStore.updateMessage(chunkId, messageId, {
        [field]: value,
    });
}
</script>

<style scoped>
.panel-header {
    height: 35px;
    padding: 0 12px;
}

.panel-header .title {
    font-size: 16px;
    font-weight: bold;
    color: var(--text-muted);
}

.inspector-content {
    margin-left: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding: 12px 0px;
}

/* 消息详情卡片 */
.message-detail-card {
    border: 1px solid var(--border-color);
    margin-bottom: 16px;
    background-color: var(--bg-workspace);
    box-sizing: border-box;
}

.card-header {
    padding: 6px 10px;
    background-color: var(--hover-bg);
    border-bottom: 1px solid var(--border-color);
    font-family: monospace;
    font-size: 11px;
}

.property-grid {
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.prop-item-time {
    grid-column: span 2;
    display: flex;
    gap: 4px;
    font-size: 12px;
}

.prop-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.prop-item.full-width {
    grid-column: span 2;
}

.prop-item label {
    font-size: 11px;
    color: var(--text-muted);
}

.prop-item input[type='text'],
.prop-item input[type='number'],
.prop-item select,
.prop-item textarea {
    width: 100%;
    box-sizing: border-box;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
    outline: none;
}

.prop-item input:focus,
.prop-item select:focus,
.prop-item textarea:focus {
    border-color: var(--active-accent);
}

/* 复选框行 */
.prop-row {
    grid-column: span 2;
    display: flex;
    gap: 20px;
    padding-top: 5px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    cursor: pointer;
}

.empty-state {
    text-align: center;
    margin-top: 60px;
    color: var(--text-muted);
}

.empty-state .sub {
    font-size: 12px;
    margin-top: 8px;
}
</style>
