import { onMounted, onUnmounted } from 'vue';
import { useCommandDispatcher, type CommandType } from './useCommandDispatcher';

// event => shortcut => command, dispatcher执行分发
export function useKeyboardShortcuts() {
    const { dispatch } = useCommandDispatcher();

    const handleKeyDown = (event: KeyboardEvent) => {
        const isModKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        const shift = event.shiftKey;
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            (event.target as HTMLElement).isContentEditable
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
        else if (!isModKey && key === 'enter') command = 'edit';
        if (command) {
            event.preventDefault();
            dispatch(command);
        }
    };

    onMounted(() => window.addEventListener('keydown', handleKeyDown));
    onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
}
