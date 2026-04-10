import { onMounted, onUnmounted } from 'vue';
import { useUiStore, type FocusArea } from '@/stores/uiStore';

export interface KeyboardShortcutHandlers {
    selectAll?: () => void;
    clearSelection?: () => void;
    copy?: () => void;
    paste?: () => void;
    undo?: () => void;
    redo?: () => void;
    save?: () => void;
    toggleExportPreview?: () => void;
    toggleHelp?: () => void;
    closeHelp?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers = {}) {
    const uiStore = useUiStore();

    function isInputLikeElement(target: EventTarget | null) {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        const tagName = target.tagName.toLowerCase();
        return (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            target.isContentEditable
        );
    }

    function resolveFocusAreaFromTarget(target: EventTarget | null): FocusArea {
        if (!(target instanceof HTMLElement)) {
            return 'none';
        }

        if (isInputLikeElement(target)) {
            return 'input';
        }

        const targetElement = target.closest('[data-focus-area]');
        if (!targetElement) {
            return 'none';
        }

        const area = targetElement.getAttribute('data-focus-area');
        return (area as FocusArea) || 'none';
    }

    function updateFocusAreaFromTarget(target: EventTarget | null) {
        const nextArea = resolveFocusAreaFromTarget(target);
        if (nextArea !== 'none') {
            uiStore.setFocusArea(nextArea);
        }
    }

    function shouldHandleSelectAllShortcut(area: FocusArea) {
        return (
            area === 'chunkView' ||
            area === 'sidebarRight' ||
            area === 'search' ||
            area === 'chunkList'
        );
    }

    function shouldHandleCopyShortcut(area: FocusArea) {
        return (
            area === 'chunkView' || area === 'sidebarRight' || area === 'search'
        );
    }

    function shouldHandlePasteShortcut(area: FocusArea) {
        return area === 'chunkView' || area === 'sidebarRight';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        const isModKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        const targetFocusArea = resolveFocusAreaFromTarget(event.target);
        const effectiveFocusArea = uiStore.helpDocumentVisible
            ? 'modal'
            : targetFocusArea !== 'none'
              ? targetFocusArea
              : uiStore.focusArea;

        if (uiStore.helpDocumentVisible) {
            if (
                event.key === 'Esc' ||
                event.key === 'Escape' ||
                (isModKey && key === 'k')
            ) {
                event.preventDefault();
                handlers.closeHelp?.();
            }
            return;
        }

        if (effectiveFocusArea === 'input') {
            return;
        }

        if (event.key === 'Esc' || event.key === 'Escape') {
            event.preventDefault();
            handlers.clearSelection?.();
            return;
        }

        if (isModKey && key === 'k') {
            event.preventDefault();
            handlers.toggleHelp?.();
            return;
        }

        if (isModKey && key === 'b') {
            event.preventDefault();
            uiStore.toggleLeftSidebar();
            return;
        }

        if (isModKey && key === 'i') {
            event.preventDefault();
            uiStore.toggleRightSidebar();
            return;
        }

        if (isModKey && key === 'p') {
            event.preventDefault();
            handlers.toggleExportPreview?.();
            return;
        }

        if (isModKey && key === 's') {
            event.preventDefault();
            handlers.save?.();
            return;
        }

        if (
            isModKey &&
            key === 'a' &&
            shouldHandleSelectAllShortcut(effectiveFocusArea)
        ) {
            event.preventDefault();
            handlers.selectAll?.();
            return;
        }

        if (
            isModKey &&
            key === 'c' &&
            shouldHandleCopyShortcut(effectiveFocusArea)
        ) {
            event.preventDefault();
            handlers.copy?.();
            return;
        }

        if (
            isModKey &&
            key === 'v' &&
            shouldHandlePasteShortcut(effectiveFocusArea)
        ) {
            event.preventDefault();
            handlers.paste?.();
            return;
        }

        if (isModKey && !event.shiftKey && key === 'z') {
            event.preventDefault();
            handlers.undo?.();
            return;
        }

        if (isModKey && event.shiftKey && key === 'z') {
            event.preventDefault();
            handlers.redo?.();
            return;
        }
    };

    const handlePointerDown = (event: PointerEvent) => {
        updateFocusAreaFromTarget(event.target);
    };

    const handleFocusIn = (event: FocusEvent) => {
        updateFocusAreaFromTarget(event.target);
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('focusin', handleFocusIn, true);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('pointerdown', handlePointerDown, true);
        window.removeEventListener('focusin', handleFocusIn, true);
    });
}
