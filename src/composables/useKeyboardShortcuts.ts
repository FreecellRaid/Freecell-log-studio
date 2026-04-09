import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from '@/stores/uiStore';

export interface KeyboardShortcutHandlers {
    selectAll?: () => void;
    clearSelection?: () => void;
    copy?: () => void;
    paste?: () => void;
    undo?: () => void;
    redo?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers = {}) {
    const uiStore = useUiStore();
    const handleKeyDown = (event: KeyboardEvent) => {
        const isModKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();

        // if (isModKey) {
        //     console.log('快捷键:', `${event.metaKey ? 'Cmd' : 'Ctrl'}+${key}`);
        // }

        // Cmd/Ctrl + A -> 全选
        if (isModKey && key === 'a') {
            event.preventDefault();
            handlers.selectAll?.();
            return;
        }

        // Esc -> 取消选择
        if (event.key === 'Esc' || event.key === 'Escape') {
            event.preventDefault();
            handlers.clearSelection?.();
            return;
        }

        // Cmd/Ctrl + C -> 复制
        if (isModKey && key === 'c') {
            event.preventDefault();
            handlers.copy?.();
            return;
        }

        // Cmd/Ctrl + V -> 粘贴
        if (isModKey && key === 'v') {
            event.preventDefault();
            handlers.paste?.();
            return;
        }

        // Cmd/Ctrl + Z -> 撤销
        if (isModKey && !event.shiftKey && key === 'z') {
            event.preventDefault();
            handlers.undo?.();
            return;
        }

        // Shift + Cmd/Ctrl + Z -> 重做
        if (isModKey && event.shiftKey && key === 'z') {
            event.preventDefault();
            handlers.redo?.();
            return;
        }

        // Cmd/Ctrl + B -> 切换左侧边栏
        if (isModKey && key === 'b') {
            event.preventDefault();
            // console.log('Cmd+B 被触发, leftVisible:', uiStore.leftVisible);
            uiStore.toggleLeftSidebar();
            // console.log('切换后 leftVisible:', uiStore.leftVisible);
            return;
        }

        // Cmd/Ctrl + I -> 切换右侧属性面板
        if (isModKey && key === 'i') {
            event.preventDefault();
            uiStore.toggleRightSidebar();
            return;
        }
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });
}
