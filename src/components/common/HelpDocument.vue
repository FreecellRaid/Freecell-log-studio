<template>
    <div
        class="help-overlay"
        data-focus-area="modal"
        @click.self="$emit('close')"
    >
        <div class="help-dialog" role="dialog" aria-modal="true">
            <div class="help-header">
                <h2>帮助文档</h2>
                <button
                    class="close-button icon-interactive"
                    type="button"
                    title="关闭帮助"
                    @click="$emit('close')"
                >
                    关闭
                </button>
            </div>

            <div class="help-content">
                <p>这里是帮助文档弹窗的占位页。</p>
                <p>后续可以补快捷键列表、导入导出说明、编辑操作说明等内容。</p>
                <p>当前支持点击标题、点击图标、或按 `Cmd/Ctrl + K` 打开。</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineEmits<{
    (e: 'close'): void;
}>();
</script>

<style scoped>
.help-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
}

.help-dialog {
    width: min(720px, calc(100vw - 32px));
    max-height: min(80vh, 760px);
    overflow: auto;
    background: var(--bg-topbar);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
}

.help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border-color);
}

.help-header h2 {
    margin: 0;
    font-size: 18px;
}

.close-button {
    padding: 6px 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-workspace);
    cursor: pointer;
}

.help-content {
    padding: 18px;
    font-size: 14px;
    line-height: 1.6;
}

.help-content p {
    margin: 0 0 12px;
}
</style>
