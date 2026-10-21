<template>
    <div v-if="summary.total" class="resource-download-status" :title="details">
        <span
            class="download-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <LoaderCircle
                v-if="summary.pending"
                class="ui-icon spinning"
                aria-hidden="true"
            />
            <CircleAlert
                v-else-if="summary.error"
                class="ui-icon"
                aria-hidden="true"
            />
            <CirclePause
                v-else-if="summary.cancelled"
                class="ui-icon"
                aria-hidden="true"
            />
            <CircleCheck v-else class="ui-icon" aria-hidden="true" />
            <span class="download-label" :class="{ warning: summary.error }">
                {{ label }}
            </span>
        </span>
        <button
            v-if="summary.pending"
            type="button"
            :title="imageResourceText.actions.stopProject"
            :aria-label="imageResourceText.actions.stopProject"
            @click="tasks.cancelAll(resourceIds)"
        >
            <Square class="ui-icon" aria-hidden="true" />
        </button>
        <button
            v-if="summary.error"
            type="button"
            :title="imageResourceText.actions.retryProject"
            :aria-label="imageResourceText.actions.retryProject"
            @click="tasks.retryFailed(resourceIds)"
        >
            <RotateCw class="ui-icon" aria-hidden="true" />
        </button>
        <button
            v-if="summary.cancelled"
            type="button"
            :title="imageResourceText.actions.resumeProject"
            :aria-label="imageResourceText.actions.resumeProject"
            @click="tasks.resumeCancelled(resourceIds)"
        >
            <Play class="ui-icon" aria-hidden="true" />
        </button>
    </div>
</template>
<script setup lang="ts">
import { imageResourceText } from '@/data/imageResourceText';
import { formatImageDownloadSummary } from '@/editor/imageResourceState';
import { computed } from 'vue';
import {
    CircleAlert,
    CircleCheck,
    CirclePause,
    LoaderCircle,
    Play,
    RotateCw,
    Square,
} from '@lucide/vue';
import { useResourceTasksStore } from '@/stores/io/resourceTasksStore';
import { useLogStore } from '@/stores/project/logStore';
import { collectDocumentResourceIds } from '@/editor/resourceReferences';

const tasks = useResourceTasksStore();
const log = useLogStore();
const resourceIds = computed(() => collectDocumentResourceIds(log.documents));
const summary = computed(() => tasks.summarize(resourceIds.value));
const label = computed(() => formatImageDownloadSummary(summary.value));
const details = computed(() => {
    const value = summary.value;
    const counts = `当前项目图片：${formatImageDownloadSummary(value, true)}`;
    const errors = [
        ...new Set(
            [...resourceIds.value].flatMap((id) => {
                const state = tasks.states[id];
                return state?.status === 'error' && state.error
                    ? [state.error]
                    : [];
            }),
        ),
    ].slice(0, 3);
    return [counts, ...errors].join('\n');
});
</script>
<style scoped>
.resource-download-status,
.download-summary {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 4px;
}
.resource-download-status {
    flex: 0 0 auto;
    max-width: 45%;
    height: 100%;
    padding: 0 6px;
}
.download-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.ui-icon {
    flex-shrink: 0;
}
button {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    flex-shrink: 0;
    padding: 0 4px;
    border: 0;
    border-radius: 0;
    color: inherit;
    background: transparent;
    cursor: pointer;
}
button:hover,
button:focus-visible {
    background: var(--bg-hover);
}
.warning {
    color: var(--color-warning);
}
.spinning {
    animation: download-spin 1s linear infinite;
}
@keyframes download-spin {
    to {
        transform: rotate(360deg);
    }
}
@media (prefers-reduced-motion: reduce) {
    .spinning {
        animation: none;
    }
}
</style>
