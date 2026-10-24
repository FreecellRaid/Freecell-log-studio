<template>
    <div
        class="view chunk-view"
        :data-focus-id="paneId"
        :class="{ 'is-active': navigation.isCommandTarget(paneId) }"
        v-command-scope="{ area: 'scene', paneId, chunkId: originalId }"
    >
        <header class="view-header">
            <div class="view-title">
                <FileText class="ui-icon icon-view-title" />
                <h2 class="text-view-title">
                    {{ chunk?.chunkName || '未知场景' }}
                </h2>
                <span class="msg-count">({{ messages.length }} 条消息)</span>
            </div>
            <div class="view-actions">
                <button
                    v-if="isMobile && chunk"
                    class="view-action-btn"
                    type="button"
                    title="重命名场景"
                    aria-label="重命名场景"
                    @click.stop="startChunkRename"
                >
                    <Pencil class="ui-icon" />
                </button>
                <button
                    v-if="!isMobile && !editorWorkspace.isSplit && chunk"
                    class="view-action-btn"
                    type="button"
                    title="向右分屏"
                    @click.stop="
                        navigation.splitPane({
                            kind: 'scene',
                            chunkId: originalId,
                        })
                    "
                >
                    <SquareSplitHorizontal class="ui-icon" />
                </button>
                <button
                    class="view-action-btn"
                    type="button"
                    title="关闭场景"
                    aria-label="关闭场景"
                    @click.stop="navigation.closePane(paneId)"
                >
                    <X class="ui-icon" />
                </button>
            </div>
        </header>
        <component
            v-if="chunk"
            :is="isMobile ? MobileMessageList : DesktopMessageList"
            :pane-id="paneId"
            :chunk="chunk"
            :messages="messages"
        />
        <div v-else class="view-empty-hint">
            当前场景已不存在，请从场景列表选择其他场景。
        </div>
    </div>
</template>

<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';

import { vCommandScope } from '@/directives/commandScope';
import {
    defineAsyncComponent,
    computed,
    toValue,
    type MaybeRefOrGetter,
} from 'vue';
import { FileText, Pencil, SquareSplitHorizontal, X } from '@lucide/vue';
import { useResponsiveMode } from '@/composables/ui/useResponsiveMode';
import { useEditorNavigation } from '@/composables/application/useEditorNavigation';
import { useMobileUiStore } from '@/stores/ui/mobileUiStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { getVisibleMessages } from '@/editor/messageVisibility';
import { useUiStore } from '@/stores/ui/uiStore';

const DesktopMessageList = defineAsyncComponent(
    () => import('@/components/workspace/DesktopMessageList.vue'),
);
const MobileMessageList = defineAsyncComponent(
    () => import('@/components/workspace/MobileMessageList.vue'),
);
const props = defineProps<{ paneId: string; originalId: string }>();
const { isMobile } = useResponsiveMode();
const { chunk, messages } = useChunkView(() => props.originalId);
const navigation = useEditorNavigation();
const editorWorkspace = useWorkspaceStore();
const mobileUiStore = useMobileUiStore();
const editorSessionStore = useEditorSessionStore();

function startChunkRename() {
    if (!chunk.value) return;
    editorSessionStore.startEditing(
        { kind: 'chunkName', chunkId: chunk.value.chunkId },
        props.paneId,
    );
    mobileUiStore.openSheet('chunkName');
}

function useChunkView(chunkId: MaybeRefOrGetter<string>) {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const uiStore = useUiStore();
    const chunk = computed(() => logStore.findChunkById(toValue(chunkId)));
    const messages = computed(() =>
        getVisibleMessages(
            chunk.value?.messages ?? [],
            styleStore.viewSettings,
            uiStore.showHidden,
        ),
    );
    return { chunk, messages };
}
</script>

<style scoped>
.chunk-view {
    min-height: 0;
}
.view-header {
    flex-shrink: 0;
}
.view-title {
    min-width: 0;
}
.text-view-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.msg-count,
.view-actions {
    flex-shrink: 0;
}
</style>
