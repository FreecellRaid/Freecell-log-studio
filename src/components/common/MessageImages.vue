<template>
    <div
        v-if="message.images?.length"
        class="message-images"
        @click.stop
        @pointerdown.stop
        @dragstart.prevent.stop
    >
        <figure v-for="(image, index) in message.images" :key="image.imageId">
            <ImageAttachmentView :attachment="image" />
            <figcaption>
                <input
                    :value="image.name"
                    aria-label="图片名称"
                    placeholder="图片名称"
                    @change="rename(image.imageId, $event)"
                />
                <button
                    type="button"
                    title="图片上移"
                    :disabled="index === 0"
                    @click="move(index, -1)"
                >
                    ↑
                </button>
                <button
                    type="button"
                    title="图片下移"
                    :disabled="index === message.images.length - 1"
                    @click="move(index, 1)"
                >
                    ↓
                </button>
                <button
                    type="button"
                    title="移除图片"
                    @click="remove(image.imageId)"
                >
                    移除
                </button>
            </figcaption>
        </figure>
    </div>
</template>
<script setup lang="ts">
import type { Message } from '@/types/log';
import { useLogCommands } from '@/stores/project/logCommands';
import ImageAttachmentView from './ImageAttachmentView.vue';
const props = defineProps<{ message: Message }>();
const commands = useLogCommands();
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
function rename(id: string, event: Event) {
    const name = (event.target as HTMLInputElement).value;
    commit(
        (props.message.images ?? []).map((image) =>
            image.imageId === id ? { ...image, name } : image,
        ),
    );
}
function move(index: number, offset: number) {
    const images = [...(props.message.images ?? [])];
    [images[index], images[index + offset]] = [
        images[index + offset]!,
        images[index]!,
    ];
    commit(images);
}
</script>
<style scoped>
.message-images {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
}
figure {
    margin: 0;
    width: 100%;
    max-width: 480px;
}
figcaption {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
}
input {
    flex: 1;
    min-width: 0;
    color: var(--text-primary);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    padding: 4px 6px;
}
button {
    min-height: 28px;
    padding: 2px 6px;
    font-size: 12px;
}
</style>
