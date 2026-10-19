<template>
    <ModalDialog
        title="插入图片"
        title-id="image-insert-title"
        @close="store.close()"
    >
        <template #icon><ImagePlus class="ui-icon" /></template>
        <form class="image-form" @submit.prevent="submit">
            <div class="image-methods">
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
                选择图片
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    multiple
                    :disabled="store.loading"
                    @change="selectFiles"
                />
            </label>
            <label v-else>
                图片链接
                <input
                    v-model="url"
                    type="url"
                    placeholder="https://…"
                    :disabled="store.loading"
                    required
                />
            </label>
            <label>
                图片名称（可选）
                <input
                    v-model="name"
                    type="text"
                    :disabled="store.loading"
                    placeholder="如：场景地图"
                />
            </label>
            <p>
                图片将排在文字后面。支持 PNG、JPEG、GIF、WebP，每张不超过 20
                MB。链接图片会在后台保存副本，失败后可重试。
            </p>
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
                        (mode === 'file' ? !files.length : !url.trim())
                    "
                >
                    插入图片
                </button>
            </div>
        </form>
    </ModalDialog>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { ImagePlus } from '@lucide/vue';
import ModalDialog from './ModalDialog.vue';
import { useImageInsertStore } from '@/stores/editor/imageInsertStore';
const store = useImageInsertStore();
const mode = ref<'file' | 'url'>('file');
const files = ref<File[]>([]);
const url = ref('');
const name = ref('');
function selectFiles(event: Event) {
    files.value = Array.from((event.target as HTMLInputElement).files ?? []);
}
function submit() {
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
.image-form > label {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.image-methods,
.image-buttons {
    display: flex;
    gap: 16px;
    align-items: center;
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
