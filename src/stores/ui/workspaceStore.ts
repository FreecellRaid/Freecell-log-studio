import { computed, readonly, ref } from 'vue';
import { defineStore } from 'pinia';
import { generateId } from '@/utils/id';
import type {
    WorkspacePane,
    WorkspaceView,
    PaneDirection,
} from '@/types/editorLayout';

function emptyPane(): WorkspacePane {
    return { paneId: generateId(), view: { kind: 'empty' } };
}
function sameView(a: WorkspaceView, b: WorkspaceView) {
    return a.kind === b.kind && JSON.stringify(a) === JSON.stringify(b);
}

export const useWorkspaceStore = defineStore('workspace', () => {
    const panes = ref<WorkspacePane[]>([emptyPane()]);
    const activePaneId = ref(panes.value[0].paneId);
    const direction = ref<PaneDirection>('horizontal');
    const ratio = ref(50);
    const activePane = computed(
        () =>
            panes.value.find((p) => p.paneId === activePaneId.value) ??
            panes.value[0],
    );
    const isSplit = computed(() => panes.value.length === 2);

    function activatePane(paneId: string) {
        if (!panes.value.some((p) => p.paneId === paneId)) return false;
        activePaneId.value = paneId;
        return true;
    }
    function showView(view: WorkspaceView, paneId = activePane.value.paneId) {
        const pane = panes.value.find((p) => p.paneId === paneId);
        if (!pane) return false;
        if (!sameView(pane.view, view)) pane.view = { ...view };
        activePaneId.value = paneId;
        return true;
    }
    function showScene(chunkId: string, paneId?: string) {
        return showView({ kind: 'scene', chunkId }, paneId);
    }
    function splitPane(view: WorkspaceView) {
        if (activePane.value.view.kind === 'empty' || view.kind === 'empty')
            return false;
        const retained = activePane.value;
        const added: WorkspacePane = {
            paneId: generateId(),
            view: { ...view },
        };
        panes.value = [retained, added];
        activePaneId.value = added.paneId;
        return true;
    }
    function showPreview(formatId: string) {
        const view: WorkspaceView = { kind: 'preview', formatId };
        if (
            activePane.value.view.kind === 'preview' ||
            activePane.value.view.kind === 'empty'
        )
            return showView(view);
        if (isSplit.value)
            return showView(
                view,
                panes.value.find((p) => p.paneId !== activePaneId.value)!
                    .paneId,
            );
        return splitPane(view);
    }
    function closePane(paneId: string) {
        if (!panes.value.some((p) => p.paneId === paneId)) return;
        if (panes.value.length === 1) {
            showView({ kind: 'empty' }, paneId);
            return;
        }
        panes.value = panes.value.filter((p) => p.paneId !== paneId);
        activePaneId.value = panes.value[0].paneId;
    }
    function closeSplit(keepPaneId = activePane.value.paneId) {
        const keep = panes.value.find((p) => p.paneId === keepPaneId);
        if (!keep || !isSplit.value) return;
        panes.value = [keep];
        activePaneId.value = keep.paneId;
    }
    function pruneScenes(hasScene: (chunkId: string) => boolean) {
        for (const pane of [...panes.value]) {
            if (pane.view.kind === 'scene' && !hasScene(pane.view.chunkId))
                closePane(pane.paneId);
        }
        return panes.value.some((p) => p.view.kind === 'scene');
    }
    function reset() {
        const pane = emptyPane();
        panes.value = [pane];
        activePaneId.value = pane.paneId;
    }
    function setRatio(value: number) {
        if (Number.isFinite(value))
            ratio.value = Math.min(80, Math.max(20, value));
    }
    function setDirection(value: PaneDirection) {
        direction.value = value;
    }
    return {
        panes: readonly(panes),
        activePaneId: readonly(activePaneId),
        activePane,
        isSplit,
        direction: readonly(direction),
        ratio: readonly(ratio),
        activatePane,
        showView,
        showScene,
        splitPane,
        showPreview,
        closePane,
        closeSplit,
        pruneScenes,
        reset,
        setRatio,
        setDirection,
    };
});
