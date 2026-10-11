import { defineAsyncComponent, type Component } from 'vue';
import {
    getWindowTargetId,
    type WindowInstance,
    type WorkspaceViewName,
} from '@/types/window';

type WorkspaceAdapter = Record<WorkspaceViewName, Component>;

const ExportPreview = defineAsyncComponent(
    () => import('@/components/common/workspace/ExportPreview.vue'),
);
const DefaultView = defineAsyncComponent(
    () => import('@/components/common/workspace/DefaultView.vue'),
);

export const desktopWorkspaceAdapter: WorkspaceAdapter = {
    chunkView: defineAsyncComponent(
        () => import('@/components/desktop/workspace/ChunkView.vue'),
    ),
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

export const mobileWorkspaceAdapter: WorkspaceAdapter = {
    chunkView: defineAsyncComponent(
        () => import('@/components/mobile/workspace/MobileChunkView.vue'),
    ),
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

export function getWorkspaceComponent(
    adapter: WorkspaceAdapter,
    win: WindowInstance | null,
): Component {
    switch (win?.windowName) {
        case 'chunkView':
        case 'exportPreview':
        case 'defaultView':
            return adapter[win.windowName];
        default:
            return adapter.defaultView;
    }
}

export function getWorkspaceProps(win: WindowInstance | null) {
    return win
        ? { windowId: win.windowId, originalId: getWindowTargetId(win) }
        : {};
}
