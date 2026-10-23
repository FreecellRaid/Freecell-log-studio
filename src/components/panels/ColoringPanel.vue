<template>
    <div
        class="panel coloring-panel"
        @pointerdown="windowStore.setFocus('coloring')"
    >
        <header class="panel-header">
            <div class="header-title"><h3>角色管理与染色</h3></div>
        </header>
        <div ref="sections" class="coloring-sections">
            <IdentityPanel
                class="coloring-section"
                :class="{ 'is-expanded': uiStore.coloringIdentityExpanded }"
                :style="bothExpanded ? { flexGrow: splitRatio } : undefined"
                v-model:expanded="uiStore.coloringIdentityExpanded"
            />
            <div
                v-if="bothExpanded"
                class="resize-handle resize-handle-y coloring-divider"
                :class="{ 'is-resizing': dragging }"
                role="separator"
                tabindex="0"
                aria-label="调整角色与染色规则分区高度"
                aria-orientation="horizontal"
                :aria-valuenow="Math.round(splitRatio * 100)"
                :aria-valuemin="Math.round(minRatio * 100)"
                :aria-valuemax="Math.round((1 - minRatio) * 100)"
                title="拖动调整分区高度，双击恢复均分"
                @pointerdown="startResize"
                @pointermove="resize"
                @pointerup="stopResize"
                @pointercancel="stopResize"
                @lostpointercapture="stopResize"
                @keydown.up.prevent="setRatio(splitRatio - 0.05)"
                @keydown.down.prevent="setRatio(splitRatio + 0.05)"
                @keydown.home.prevent="setRatio(minRatio)"
                @keydown.end.prevent="setRatio(1 - minRatio)"
            ></div>
            <RuleEditorPanel
                class="coloring-section"
                :class="{ 'is-expanded': uiStore.coloringRulesExpanded }"
                :style="bothExpanded ? { flexGrow: 1 - splitRatio } : undefined"
                v-model:expanded="uiStore.coloringRulesExpanded"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import IdentityPanel from '@/components/panels/IdentityPanel.vue';
import RuleEditorPanel from '@/components/panels/RuleEditorPanel.vue';
import { useUiStore } from '@/stores/ui/uiStore';
import { useWindowStore } from '@/stores/ui/windowStore';

const uiStore = useUiStore();
const windowStore = useWindowStore();
const sections = ref<HTMLElement | null>(null);
const { height } = useElementSize(sections);
const bothExpanded = computed(
    () => uiStore.coloringIdentityExpanded && uiStore.coloringRulesExpanded,
);
const availableHeight = computed(() => Math.max(0, height.value - 4));
const minRatio = computed(() =>
    availableHeight.value > 0 ? Math.min(0.5, 64 / availableHeight.value) : 0.5,
);
const splitRatio = computed(() => {
    const saved = uiStore.coloringSplitRatio;
    return Math.min(
        1 - minRatio.value,
        Math.max(minRatio.value, Number.isFinite(saved) ? saved : 0.5),
    );
});
const dragging = ref(false);
let drag: {
    pointerId: number;
    target: HTMLElement;
    startY: number;
    startRatio: number;
    previousCursor: string;
    previousUserSelect: string;
} | null = null;

function setRatio(value: number) {
    uiStore.coloringSplitRatio = Math.min(
        1 - minRatio.value,
        Math.max(minRatio.value, value),
    );
}

function startResize(event: PointerEvent) {
    if (event.button !== 0 || !bothExpanded.value || drag) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    drag = {
        pointerId: event.pointerId,
        target,
        startY: event.clientY,
        startRatio: splitRatio.value,
        previousCursor: document.body.style.cursor,
        previousUserSelect: document.body.style.userSelect,
    };
    target.setPointerCapture(event.pointerId);
    dragging.value = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
}

function resize(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId || !availableHeight.value)
        return;
    setRatio(
        drag.startRatio + (event.clientY - drag.startY) / availableHeight.value,
    );
}

function stopResize(event?: PointerEvent) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const previous = drag;
    drag = null;
    dragging.value = false;
    document.body.style.cursor = previous.previousCursor;
    document.body.style.userSelect = previous.previousUserSelect;
    if (previous.target.hasPointerCapture(previous.pointerId)) {
        previous.target.releasePointerCapture(previous.pointerId);
    }
}

watch(bothExpanded, () => stopResize());
onUnmounted(stopResize);
</script>

<style scoped>
.coloring-sections {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.coloring-divider {
    flex: 0 0 4px;
    touch-action: none;
}

.coloring-divider:focus-visible,
.coloring-divider.is-resizing {
    background: var(--active-accent);
}

.coloring-section {
    flex: 0 0 auto;
    height: auto;
    min-height: 0;
}

.coloring-section.is-expanded {
    flex: 1 1 0;
    min-height: 32px;
}

.coloring-section :deep(> .panel-header) {
    min-height: 32px;
    border-top: 1px solid var(--border-color);
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: normal;
    cursor: pointer;
    user-select: none;
}

.coloring-section :deep(> .panel-header:hover) {
    background: var(--hover-bg);
}

.coloring-section :deep(.section-toggle) {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    align-self: stretch;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.coloring-section :deep(.expand-icon) {
    flex-shrink: 0;
}

.coloring-section :deep(.section-count) {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 11px;
}

.coloring-section :deep(.panel-header > .icon-button) {
    margin-left: 8px;
    flex-shrink: 0;
}

.coloring-section :deep(> .panel-block-list) {
    overscroll-behavior: contain;
}
</style>
