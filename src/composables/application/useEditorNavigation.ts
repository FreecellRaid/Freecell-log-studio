import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useMessageRevealStore } from '@/stores/editor/messageRevealStore';
import {
    commandContextForPane,
    commandContextOwner,
    sameCommandContext,
    type CommandContext,
} from '@/types/commandContext';
import type { LeftPanel, WorkspaceView } from '@/types/editorLayout';

// 协调区域之间的操作，不持有布局副本、注册表或焦点历史。
export function useEditorNavigation() {
    const workspace = useWorkspaceStore();
    const layout = useLayoutStore();
    const dialogs = useDialogStore();
    const commands = useCommandContextStore();
    const reveal = useMessageRevealStore();
    function focusWorkspace() {
        if (!dialogs.isBlocking)
            commands.activate(commandContextForPane(workspace.activePane));
    }
    function activatePane(paneId: string) {
        if (dialogs.isBlocking || !workspace.activatePane(paneId)) return;
        focusWorkspace();
    }
    function activatePanel(panel: LeftPanel | 'inspector') {
        const visible =
            panel === 'inspector'
                ? layout.inspectorOpen
                : layout.sidebarOpen && layout.activePanel === panel;
        if (visible && !dialogs.isBlocking)
            commands.activate({ area: 'panel', panel });
    }
    function activateContext(context: CommandContext) {
        if (context.area === 'panel') activatePanel(context.panel);
        else {
            const pane = workspace.panes.find(
                (item) => item.paneId === context.paneId,
            );
            if (
                pane &&
                sameCommandContext(commandContextForPane(pane), context)
            )
                activatePane(pane.paneId);
        }
    }
    function reconcileContext() {
        const context = commands.current;
        const pane =
            context.area === 'panel'
                ? null
                : workspace.panes.find(
                      (item) => item.paneId === context.paneId,
                  );
        const valid =
            context.area === 'panel'
                ? context.panel === 'inspector'
                    ? layout.inspectorOpen
                    : layout.sidebarOpen && layout.activePanel === context.panel
                : pane &&
                  sameCommandContext(commandContextForPane(pane), context);
        if (!valid) focusWorkspace();
        const request = reveal.pending;
        if (
            request &&
            !workspace.panes.some(
                (item) =>
                    item.paneId === request.paneId &&
                    item.view.kind === 'scene' &&
                    item.view.chunkId === request.chunkId,
            )
        )
            reveal.clear(request.requestId);
    }
    function showScene(chunkId: string, paneId?: string) {
        workspace.showScene(chunkId, paneId);
        focusWorkspace();
        reconcileContext();
    }
    function showPreview(formatId: string) {
        workspace.showPreview(formatId);
        focusWorkspace();
        reconcileContext();
    }
    function splitPane(view: WorkspaceView) {
        const result = workspace.splitPane(view);
        if (result) focusWorkspace();
        reconcileContext();
        return result;
    }
    function closePane(paneId: string) {
        workspace.closePane(paneId);
        reconcileContext();
    }
    function closeSplit(keepPaneId?: string) {
        workspace.closeSplit(keepPaneId);
        focusWorkspace();
        reconcileContext();
    }
    function pruneScenes(hasScene: (chunkId: string) => boolean) {
        const result = workspace.pruneScenes(hasScene);
        reconcileContext();
        return result;
    }
    function openPanel(panel = layout.activePanel) {
        layout.openPanel(panel);
        activatePanel(panel);
    }
    function selectPanel(panel: LeftPanel) {
        layout.selectPanel(panel);
        if (layout.sidebarOpen) activatePanel(panel);
        reconcileContext();
    }
    function closePanel() {
        layout.closePanel();
        reconcileContext();
    }
    function togglePanel() {
        if (layout.sidebarOpen) closePanel();
        else openPanel();
    }
    function toggleInspector() {
        layout.toggleInspector();
        reconcileContext();
    }
    function requestMessageReveal(
        chunkId: string,
        messageId: string,
        paneId = workspace.activePaneId,
    ) {
        const pane = workspace.panes.find((item) => item.paneId === paneId);
        if (pane?.view.kind === 'scene' && pane.view.chunkId === chunkId)
            reveal.request(paneId, chunkId, messageId);
    }
    function isCommandTarget(owner: string) {
        return (
            !dialogs.isBlocking &&
            commandContextOwner(commands.current) === owner
        );
    }
    return {
        focusWorkspace,
        activatePane,
        activatePanel,
        activateContext,
        reconcileContext,
        showScene,
        showPreview,
        splitPane,
        closePane,
        closeSplit,
        pruneScenes,
        openPanel,
        selectPanel,
        closePanel,
        togglePanel,
        toggleInspector,
        requestMessageReveal,
        isCommandTarget,
    };
}
