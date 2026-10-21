<template>
    <ModalDialog
        class="image-editor-dialog"
        :title="editing ? '编辑图片' : '插入图片'"
        title-id="image-insert-title"
        @close="store.close()"
    >
        <template #icon><ImagePlus class="ui-icon" /></template>
        <form id="image-edit-form" class="image-form" @submit.prevent="submit">
            <ImageAttachmentView
                :attachment="attachment"
                :preview-src="!attachment ? draftPreview : undefined"
                class="edit-preview"
            />
            <div class="image-fields" :class="{ 'single-field': !editing }">
                <label>
                    <strong>图片名称</strong>
                    <input
                        v-model="name"
                        aria-label="图片名称"
                        type="text"
                        :disabled="store.loading"
                        placeholder="输入图片名称"
                    />
                </label>
                <label v-if="editing" for="image-order">
                    <strong>图片位置（共 {{ imageCount }} 张）</strong>
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
                </label>
            </div>
            <div class="image-replacement">
                <div class="resource-method-header">
                    <strong>{{ editing ? '替换资源' : '选择资源' }}</strong>
                    <div class="image-methods">
                        <label>
                            <input
                                v-model="mode"
                                type="radio"
                                value="file"
                                :disabled="store.loading"
                                @change="methodTouched = true"
                            />
                            本地文件
                        </label>
                        <label>
                            <input
                                v-model="mode"
                                type="radio"
                                value="url"
                                :disabled="store.loading"
                                @change="methodTouched = true"
                            />
                            图片链接
                        </label>
                    </div>
                </div>
                <input
                    v-if="mode === 'file'"
                    class="file-input"
                    type="file"
                    aria-label="选择图片文件"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    :multiple="!editing"
                    :disabled="store.loading"
                    @change="selectFiles"
                />
                <input
                    v-else
                    v-model="url"
                    aria-label="图片链接"
                    type="url"
                    placeholder="https://…"
                    :disabled="store.loading"
                    required
                    @change="updateUrlPreview"
                />
                <p v-if="!editing" class="field-hint">
                    支持 PNG、JPEG、GIF、WebP，每张不超过 20 MB。
                </p>
            </div>
            <p v-if="store.loading" role="status">正在保存图片…</p>
            <p v-if="store.error" class="image-error" role="alert">
                {{ store.error }}
            </p>
        </form>
        <template #footer>
            <div class="image-buttons">
                <button
                    class="text-button"
                    type="button"
                    @click="store.close()"
                >
                    取消
                </button>
                <button
                    class="text-button is-primary"
                    type="submit"
                    form="image-edit-form"
                    :disabled="
                        store.loading ||
                        (mode === 'url'
                            ? !url.trim()
                            : !editing && !files.length)
                    "
                >
                    {{ editing ? '保存修改' : '插入图片' }}
                </button>
            </div>
        </template>
    </ModalDialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { ImagePlus } from '@lucide/vue';
import ModalDialog from './ModalDialog.vue';
import ImageAttachmentView from '@/components/common/ImageAttachmentView.vue';
import { useLogStore } from '@/stores/project/logStore';
import {
    resourceRepository,
    normalizeImageUrl,
} from '@/io/storage/resourceStorage';
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
const mode = ref<'file' | 'url'>('file');
const methodTouched = ref(false);
const originalUrl = ref('');
const filePreview = ref('');
const urlPreview = ref('');
const draftPreview = computed(() =>
    mode.value === 'file' ? filePreview.value : urlPreview.value,
);
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
        mode.value = 'file';
        methodTouched.value = false;
        originalUrl.value = '';
        urlPreview.value = '';
        files.value = [];
        url.value = '';
        name.value = attachment.value?.name ?? '';
        position.value =
            (message.value?.images?.findIndex(
                (image) => image.imageId === target?.imageId,
            ) ?? -1) + 1;
        if (!target?.resourceId) return;
        try {
            const resource = await resourceRepository.get(target.resourceId);
            if (!active) return;
            originalUrl.value = resource?.sourceUrl ?? '';
            if (!url.value) url.value = originalUrl.value;
            if (!methodTouched.value)
                mode.value = originalUrl.value ? 'url' : 'file';
        } catch {
            // 预览组件统一展示资源读取错误，替换链接仍可手动输入。
        }
    },
    { immediate: true },
);
watch(
    () => files.value[0],
    (file, _previous, onCleanup) => {
        filePreview.value = file ? URL.createObjectURL(file) : '';
        const current = filePreview.value;
        onCleanup(() => {
            if (current) URL.revokeObjectURL(current);
        });
    },
);
function updateUrlPreview() {
    try {
        urlPreview.value = normalizeImageUrl(url.value);
    } catch {
        urlPreview.value = '';
    }
}
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
                : mode.value === 'url' && url.value.trim() !== originalUrl.value
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
.image-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13px;
    line-height: 1.5;
}
.image-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
}
.image-fields.single-field {
    grid-template-columns: minmax(0, 1fr);
}
.image-fields label,
.image-replacement {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}
.resource-method-header,
.image-methods,
.image-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
}
.image-form input::file-selector-button {
    font: inherit;
    padding: 1px 6px;
}
.image-buttons .text-button {
    font: inherit;
    padding: 6px 12px;
}
.resource-method-header {
    justify-content: space-between;
    flex-wrap: wrap;
}
.resource-method-header strong {
    font-size: inherit;
    font-weight: 600;
    color: var(--text-primary);
}
.image-methods {
    flex-wrap: wrap;
}
.image-methods label {
    display: flex;
    align-items: center;
    gap: 6px;
}
.image-methods input[type='radio'] {
    margin: 0;
}
.image-form input:not([type='radio']) {
    font: inherit;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 8px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
}
.image-buttons {
    width: 100%;
    justify-content: flex-end;
    font-size: 13px;
    line-height: 1.6;
}
p {
    color: var(--text-muted);
    margin: 0;
}
.field-hint {
    font-size: 12px;
}
.image-error {
    color: var(--color-warning);
}
@media (max-width: 360px) {
    .image-fields {
        grid-template-columns: minmax(0, 1fr);
    }
}
.image-editor-dialog.modal-dialog {
    max-height: min(92dvh, 760px);
}

input::placeholder {
    color: var(--text-muted);
}

input:focus-visible,
button:focus-visible {
    outline: 1px solid var(--active-accent);
    outline-offset: -1px;
}
</style>
