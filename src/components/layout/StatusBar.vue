<template>
    <div v-if="activeChunk" class="status-bar">
        <div class="status-left">
            <div class="status-item" title="选中消息命中的自定义染色规则数">
                <Palette class="ui-icon" />
                {{ selectedCustomRuleCount }} 条自定义规则
            </div>
            <div
                class="status-item"
                :title="
                    styleStore.viewSettings.hideOoc
                        ? '已隐藏 OOC 消息'
                        : '显示 OOC 消息'
                "
            >
                <MessageCircle class="ui-icon" />
                场外消息 {{ styleStore.viewSettings.hideOoc ? '隐藏' : '显示' }}
            </div>
            <div
                class="status-item"
                :title="
                    styleStore.viewSettings.hideCommand
                        ? '已隐藏指令消息'
                        : '显示指令消息'
                "
            >
                <Command class="ui-icon" />
                指令消息
                {{ styleStore.viewSettings.hideCommand ? '隐藏' : '显示' }}
            </div>
        </div>

        <div class="status-right">
            <div
                v-if="currentDocumentName"
                class="status-item status-item-truncate status-item-document"
                title="当前文档"
            >
                <FolderOpen class="ui-icon" />
                {{ currentDocumentName }}
            </div>
            <div class="status-item status-item-truncate" title="当前活动分块">
                <FileText class="ui-icon" />
                {{ activeChunkName }}
            </div>
            <div class="status-item" title="当前分块消息数（可见/总数）">
                <MessagesSquare class="ui-icon" />
                {{ activeChunkVisibleMsgs }} /
                {{ activeChunkTotalMsgs }} 可见/总数
            </div>
            <div class="status-item" v-if="selectedCount > 0">
                {{ selectedCount }} Selected
            </div>
            <div
                class="status-item"
                v-if="currentSelectedIndex !== null"
                title="选中位置"
            >
                Ln {{ currentSelectedIndex + 1 }}
            </div>
        </div>
    </div>
    <div v-else>
        <div class="status-item">导入文件查看详细信息</div>
    </div>
</template>

<script setup lang="ts">
import {
    Command,
    FileText,
    FolderOpen,
    MessageCircle,
    MessagesSquare,
    Palette,
} from '@lucide/vue';
import { computed } from 'vue';
import { useLogStore } from '@/stores/logStore';
import { useUiStore } from '@/stores/uiStore';
import { useStyleStore } from '@/stores/styleStore';
import { useFilter } from '@/composables/useFilter';
import { matchesMessageFilter } from '@/editor/filter';

const logStore = useLogStore();
const uiStore = useUiStore();
const styleStore = useStyleStore();
const filterTool = useFilter();

const activeChunk = computed(function () {
    if (
        !uiStore.currentActiveView.windowId ||
        uiStore.currentActiveView.windowId === 'defaultView'
    )
        return null;
    return logStore.findChunkById(uiStore.currentActiveView.windowId);
});

const activeChunkName = computed(function () {
    return activeChunk.value ? activeChunk.value.chunkName : '';
});

const activeChunkTotalMsgs = computed(function () {
    return activeChunk.value ? activeChunk.value.messages.length : 0;
});

const activeChunkVisibleMsgs = computed(function () {
    if (!activeChunk.value) return 0;

    const messages = activeChunk.value.messages;
    const { hideOoc, hideCommand } = styleStore.viewSettings;

    if (!hideOoc && !hideCommand) {
        return messages.length;
    }

    let count = 0;
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const shouldHide =
            (hideOoc && msg.isOoc) || (hideCommand && msg.isCommand);
        if (!shouldHide) {
            count++;
        }
    }
    console.log('activeChunkVisibleMsgs:', count);
    return count;
});

const currentDocumentName = computed(function () {
    if (!activeChunk.value) {
        return '';
    }

    const document = logStore.findDocumentById(activeChunk.value.docId);
    return document ? document.docName : '';
});

const selectedCount = computed(function () {
    return filterTool.messageSelectionCount.value;
});

const selectedCustomRuleCount = computed(function () {
    const selectedMessages = filterTool.selectedMessages.value;
    const customRules = styleStore.customRules;

    if (selectedMessages.length === 0 || customRules.length === 0) {
        return 0;
    }

    let count = 0;
    for (let i = 0; i < customRules.length; i++) {
        const rule = customRules[i];
        for (let j = 0; j < selectedMessages.length; j++) {
            if (matchesMessageFilter(selectedMessages[j], rule.filter)) {
                count++;
                break;
            }
        }
    }

    return count;
});

const currentSelectedIndex = computed<number | null>(function () {
    if (filterTool.messageSelectionIds.value.size === 0) {
        return null;
    }

    if (activeChunk.value && filterTool.lastSelectedMessageId.value) {
        const targetId = filterTool.lastSelectedMessageId.value;
        const msg = activeChunk.value.messages.find(function (message) {
            return message.messageId === targetId;
        });

        if (msg) {
            return msg.messageIndex;
        }
    }

    return null;
});
</script>

<style scoped>
.status-bar {
    width: 100%;
    height: 100%;
    background-color: var(--bg-statusbar);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    user-select: none;
    overflow: hidden;
}

.status-left,
.status-right {
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 0;
}

.status-left {
    flex: 1 1 auto;
    overflow: hidden;
}

.status-right {
    flex: 0 0 auto;
    margin-left: auto;
}

.status-item {
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 0;
    padding: 0 10px;
    cursor: default;
    transition: background-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
}

.status-item-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
}

.status-item-document {
    max-width: 220px;
}

.status-left .status-item-truncate {
    max-width: 180px;
}

.ui-icon {
    margin-right: 4px;
}

@media (max-width: 1100px) {
    .status-left .status-item:nth-last-child(-n + 2) {
        display: none;
    }
}

@media (max-width: 900px) {
    .status-left {
        flex: 0 1 auto;
    }

    .status-left .status-item:not(:first-child) {
        display: none;
    }

    .status-item-document {
        max-width: 160px;
    }
}
</style>
