<template>
    <div
        v-if="message.images?.length"
        class="message-images"
        @click.stop
        @pointerdown.stop
        @dragstart.prevent.stop
    >
        <div
            v-for="image in message.images"
            :key="image.imageId"
            class="image-card"
        >
            <button
                type="button"
                class="image-open"
                :aria-label="`编辑图片：${image.name || '图片'}`"
                @click="editor.open(message.messageId, image.imageId)"
            >
                <ImageAttachmentView :attachment="image" compact />
            </button>
            <button
                type="button"
                class="view-action-btn"
                :aria-label="`删除图片：${image.name || '图片'}`"
                title="删除图片"
                @click.stop="remove(image.imageId)"
            >
                <X aria-hidden="true" class="ui-icon" />
            </button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { X } from '@lucide/vue';
import { useImageInsertStore } from '@/stores/editor/imageInsertStore';
import type { Message } from '@/types/log';
import { useLogCommands } from '@/stores/project/logCommands';
import ImageAttachmentView from './ImageAttachmentView.vue';
const props = defineProps<{ message: Message }>();
const commands = useLogCommands();
const editor = useImageInsertStore();
function commit(images: NonNullable<Message['images']>) {
    commands.updateMessage(props.message.chunkId, props.message.messageId, {
        images,
    });
}
function remove(id: string) {
    commit(
        (props.message.images ?? []).filter((image) => image.imageId !== id),
    );
}
</script>
<style scoped>
.message-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
    min-width: 0;
}
.image-card {
    position: relative;
    width: 144px;
    height: 108px;
    max-width: 100%;
    flex: 0 0 auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-secondary);
}
.image-open {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    cursor: pointer;
    background: transparent;
}
.image-open:focus-visible {
    outline: 2px solid var(--text-primary);
    outline-offset: -3px;
}
.view-action-btn {
    position: absolute;
    top: 0px;
    right: 2px;
    cursor: pointer;
}
.view-action-btn:hover {
    background-color: transparent;
}
</style>
