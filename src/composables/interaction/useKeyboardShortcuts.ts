import { onMounted, onUnmounted } from 'vue';
import {
    useCommandDispatcher,
    type CommandType,
} from '@/composables/application/useCommandDispatcher';

// event => shortcut => command, dispatcher执行分发
export function useKeyboardShortcuts() {
    const { dispatch } = useCommandDispatcher();
    const { handleBrowserShortcut, handleKeyDown } =
        createShortcutHandlers(dispatch);

    onMounted(() => {
        window.addEventListener('keydown', handleBrowserShortcut, true);
        window.addEventListener('keydown', handleKeyDown);
    });
    onUnmounted(() => {
        window.removeEventListener('keydown', handleBrowserShortcut, true);
        window.removeEventListener('keydown', handleKeyDown);
    });
}

export function createShortcutHandlers(
    dispatch: (command: CommandType) => void,
) {
    // 查找/替换在捕获阶段接管，包括输入框和弹窗内，避免浏览器先执行默认行为。
    // 是否允许打开业务界面仍由 dispatcher 的弹窗优先级决定。
    const handleBrowserShortcut = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.isComposing) return;
        const key = event.key.toLowerCase();
        let command: CommandType | null = null;
        if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            !event.shiftKey &&
            key === 'f'
        )
            command = 'openSearch';
        else if (
            (event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                !event.shiftKey &&
                key === 'h') ||
            (event.metaKey &&
                event.altKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                (key === 'f' || event.code === 'KeyF'))
        )
            command = 'replace';
        if (!command) return;
        event.preventDefault();
        event.stopPropagation();
        dispatch(command);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.isComposing) return;
        const isModKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        const shift = event.shiftKey;
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement ||
            (event.target instanceof HTMLElement &&
                event.target.isContentEditable)
        ) {
            return;
        }

        let command: CommandType | null = null;

        if (isModKey && key === 'a') command = 'selectAll';
        else if (key === 'escape') command = 'cancel';
        else if (isModKey && key === 'c') command = 'copy';
        else if (isModKey && key === 'v') command = 'paste';
        else if (isModKey && !shift && key === 'z') command = 'undo';
        else if (isModKey && key === 'y') command = 'redo';
        else if (isModKey && shift && key === 'z') command = 'redo';
        else if (isModKey && key === 'b') command = 'toggleLeft';
        // 这里是为了避免打不开 dev tools
        else if (isModKey && !shift && key === 'i') command = 'toggleRight';
        else if (isModKey && key === 'k') command = 'openHelp';
        else if (isModKey && key === 's') command = 'save';
        else if (isModKey && key === 'p') command = 'export';
        else if (isModKey && key === 'backspace') command = 'delete';
        else if (isModKey && key === 'delete') command = 'delete';
        else if (isModKey && key === 'arrowup') command = 'selectPrevious';
        else if (isModKey && key === 'arrowdown') command = 'selectNext';
        else if (isModKey && key === '/') command = 'toggleOoc';
        else if (isModKey && key === '\\') command = 'toggleCommand';
        else if (isModKey && key === 'e') command = 'merge';
        else if (isModKey && key === 'd') command = 'selectNextSamePlayer';
        else if (!isModKey && key === 'enter') command = 'jump';
        if (command) {
            event.preventDefault();
            dispatch(command);
        }
    };

    return { handleBrowserShortcut, handleKeyDown };
}
