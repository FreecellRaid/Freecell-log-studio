import { defineAsyncComponent, type Component } from 'vue';
import {
    getWindowTargetId,
    type WindowInstance,
    type WorkspaceViewName,
} from '@/types/window';

type WorkspaceAdapter = Record<WorkspaceViewName, Component>;

const ExportPreview = defineAsyncComponent(
    () => import('@/components/workspace/ExportPreview.vue'),
);
const DefaultView = defineAsyncComponent(
    () => import('@/components/workspace/DefaultView.vue'),
);

export const desktopWorkspaceAdapter: WorkspaceAdapter = {
    chunkView: defineAsyncComponent(
        () => import('@/components/workspace/DesktopChunkView.vue'),
    ),
    exportPreview: ExportPreview,
    defaultView: DefaultView,
};

export const mobileWorkspaceAdapter: WorkspaceAdapter = {
    chunkView: defineAsyncComponent(
        () => import('@/components/workspace/MobileChunkView.vue'),
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
