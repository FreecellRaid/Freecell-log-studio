<template>
    <div
        class="help-overlay"
        data-focus-area="modal"
        @pointerdown.self="windowStore.closeHelpDocument()"
    >
        <div class="help-dialog" role="dialog" aria-modal="true">
            <div class="help-header">
                <div class="header-title">
                    <HelpCircle class="ui-icon" />
                    <h2>帮助文档</h2>
                </div>
                <button
                    class="close-button icon-interactive"
                    type="button"
                    title="关闭帮助 (Esc)"
                    @click="windowStore.closeHelpDocument()"
                >
                    <X class="ui-icon" />
                </button>
            </div>

            <div class="help-content">
                <slot>
                    <div class="placeholder-text">
                        此处为帮助文档内容，支持快捷键列表、操作说明等。
                    </div>
                </slot>
            </div>

            <div class="help-footer">
                <div class="shortcut-hint">按 Esc 键关闭</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { HelpCircle, X } from '@lucide/vue';
import { useWindowStore } from '@/stores/windowStore';

const windowStore = useWindowStore();
</script>

<style scoped>
.help-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
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
    padding: 8px 18px;
    border-bottom: 1px solid var(--border-color);
}

.help-header h2 {
    margin: 0;
    font-size: 16px;
}

.close-button {
    padding: 6px 10px;
    border: none;
    background-color: var(--bg-topbar);
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

.help-footer {
    margin-top: 24px;
    padding: 18px;
    font-size: 12px;
    color: var(--text-muted);
}
</style>
