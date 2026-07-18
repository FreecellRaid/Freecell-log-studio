<template>
    <div class="popover" role="menu">
        <button
            class="import-item"
            type="button"
            role="menuitem"
            @click="emit('file')"
        >
            从文件导入
        </button>
        <button
            class="import-item"
            type="button"
            role="menuitem"
            @click="emit('clipboard')"
        >
            从剪切板导入
        </button>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
    file: [];
    clipboard: [];
}>();
</script>

<style scoped>
.popover {
    width: 150px;
    box-shadow: 0 4px 12px var(--box-shadow);
}

.import-item {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
    text-align: left;
    white-space: nowrap;
    cursor: pointer;
}

.import-item:hover,
.import-item:focus-visible {
    background: var(--hover-bg);
    color: var(--icon-color-strong);
}
</style>
