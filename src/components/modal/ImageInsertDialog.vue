<template>
    <ModalDialog
        :title="editing ? '编辑图片' : '插入图片'"
        title-id="image-insert-title"
        @close="store.close()"
    >
        <template #icon><ImagePlus class="ui-icon" /></template>
        <form class="image-form" @submit.prevent="submit">
            <ImageAttachmentView
                v-if="attachment"
                :attachment="attachment"
                class="edit-preview"
            />
            <div class="image-methods">
                <label v-if="editing">
                    <input
                        v-model="mode"
                        type="radio"
                        value="keep"
                        :disabled="store.loading"
                    />
                    当前资源
                </label>
                <label>
                    <input
                        v-model="mode"
                        type="radio"
                        value="file"
                        :disabled="store.loading"
                    />
                    本地文件
                </label>
                <label>
                    <input
                        v-model="mode"
                        type="radio"
                        value="url"
                        :disabled="store.loading"
                    />
                    图片链接
                </label>
            </div>
            <label v-if="mode === 'file'">
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    :multiple="!editing"
                    :disabled="store.loading"
                    @change="selectFiles"
                />
            </label>
            <label v-else-if="mode === 'url'">
                <input
                    v-model="url"
                    type="url"
                    placeholder="输入图片链接，如https://…"
                    :disabled="store.loading"
                    required
                />
            </label>
            <label>
                <input
                    v-model="name"
                    type="text"
                    :disabled="store.loading"
                    placeholder="输入图片名称"
                />
            </label>
            <div v-if="editing" class="image-order-field">
                <label for="image-order">
                    排列顺序（共 {{ imageCount }} 张）
                </label>
                <div class="image-order">
                    <button
                        type="button"
                        :disabled="store.loading || position <= 1"
                        @click="position--"
                    >
                        前移
                    </button>
                    <input
                        id="image-order"
                        v-model.number="position"
                        type="number"
                        min="1"
                        :max="imageCount"
                        required
                        :disabled="store.loading"
                        aria-label="图片排列顺序"
                    />
                    <button
                        type="button"
                        :disabled="store.loading || position >= imageCount"
                        @click="position++"
                    >
                        后移
                    </button>
                </div>
            </div>
            <p v-if="editing" class="resource-info">{{ resourceInfo }}</p>
            <p>支持 PNG、JPEG、GIF、WebP，每张不超过 20 MB。</p>
            <p v-if="store.loading" role="status">正在保存图片…</p>
            <p v-if="store.error" class="image-error" role="alert">
                {{ store.error }}
            </p>
            <div class="image-buttons">
                <button type="button" @click="store.close()">取消</button>
                <button
                    type="submit"
                    :disabled="
                        store.loading ||
                        (mode === 'file'
                            ? !files.length
                            : mode === 'url' && !url.trim())
                    "
                >
                    {{ editing ? '保存修改' : '插入图片' }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { ImagePlus } from '@lucide/vue';
import ModalDialog from './ModalDialog.vue';
import ImageAttachmentView from '@/components/common/ImageAttachmentView.vue';
import { useLogStore } from '@/stores/project/logStore';
import { resourceRepository } from '@/io/storage/resourceStorage';
import { useImageInsertStore } from '@/stores/editor/imageInsertStore';
const store = useImageInsertStore();
const log = useLogStore();
const editing = computed(() => !!store.target?.imageId);
const message = computed(() =>
    store.target ? log.messagesById.get(store.target.messageId) : undefined,
);
const attachment = computed(() =>
    message.value?.images?.find(
        (image) => image.imageId === store.target?.imageId,
    ),
);
const imageCount = computed(() => message.value?.images?.length ?? 0);
const position = ref(1);
const resourceInfo = ref('');
const mode = ref<'keep' | 'file' | 'url'>('file');
const files = ref<File[]>([]);
const url = ref('');
const name = ref('');
watch(
    () => store.target,
    async (target, _previous, onCleanup) => {
        let active = true;
        onCleanup(() => {
            active = false;
        });
        mode.value = target?.imageId ? 'keep' : 'file';
        files.value = [];
        url.value = '';
        name.value = attachment.value?.name ?? '';
        position.value =
            (message.value?.images?.findIndex(
                (image) => image.imageId === target?.imageId,
            ) ?? -1) + 1;
        resourceInfo.value = '';
        if (!target?.resourceId) return;
        try {
            const resource = await resourceRepository.get(target.resourceId);
            if (!active) return;
            if (mode.value === 'keep' && !url.value)
                url.value = resource?.sourceUrl ?? '';
            resourceInfo.value = resource?.sourceUrl
                ? `当前资源：${resource.sourceUrl}`
                : resource?.blob
                  ? '当前资源：本地图片'
                  : '当前资源缺失，可选择文件或链接替换。';
        } catch {
            if (active)
                resourceInfo.value = '当前资源读取失败，可选择文件或链接替换。';
        }
    },
    { immediate: true },
);
function selectFiles(event: Event) {
    files.value = Array.from((event.target as HTMLInputElement).files ?? []);
}
function submit() {
    if (editing.value) {
        void store.saveEdit({
            name: name.value,
            position: position.value,
            ...(mode.value === 'file'
                ? { file: files.value[0] }
                : mode.value === 'url'
                  ? { url: url.value }
                  : {}),
        });
        return;
    }
    void store.insert(
        mode.value === 'file'
            ? { files: files.value, name: name.value }
            : { url: url.value, name: name.value },
    );
}
onUnmounted(store.cancel);
</script>
<style scoped>
.image-form,
.image-form > label,
.image-order-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.image-methods,
.image-order,
.image-buttons {
    display: flex;
    gap: 16px;
    align-items: center;
}
.image-methods {
    flex-wrap: wrap;
    gap: 10px;
}
.image-order input {
    flex: 1;
    min-width: 0;
}
.image-order button {
    flex-shrink: 0;
    padding: 6px 10px;
}
.edit-preview {
    width: 100%;
}
.edit-preview :deep(.image-preview),
.edit-preview :deep(img) {
    max-height: 160px;
}
.resource-info {
    overflow-wrap: anywhere;
    font-size: 12px;
}
.image-methods label {
    display: flex;
    gap: 6px;
    align-items: center;
}
.image-form input:not([type='radio']) {
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
}
.image-buttons {
    justify-content: flex-end;
}
.image-buttons button {
    padding: 6px 12px;
}
p {
    color: var(--text-muted);
    margin: 0;
}
.image-error {
    color: var(--color-warning);
}
</style>
