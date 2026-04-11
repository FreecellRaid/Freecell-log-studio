import { onMounted, onUnmounted } from 'vue';
import { useCommandDispatcher, type CommandType } from './useCommandDispatcher';

// event => shortcut => command, dispatcher执行分发
export function useKeyboardShortcuts() {
    const { dispatch } = useCommandDispatcher();

    const handleKeyDown = (event: KeyboardEvent) => {
        if (
            event.target instanceof HTMLInputElement || 
            event.target instanceof HTMLTextAreaElement ||
            (event.target as HTMLElement).isContentEditable
        ) {
            return; 
        }

        const isModKey = event.ctrlKey || event.metaKey;
        const key = event.key.toLowerCase();
        const shift = event.shiftKey;

        let command: CommandType | null = null;

        if (isModKey && key === 'a') command = 'selectAll';
        else if (key === 'escape') command = 'cancel';
        else if (isModKey && key === 'c') command = 'copy';
        else if (isModKey && key === 'v') command = 'paste';
        else if (isModKey && !shift && key === 'z') command = 'undo';
        else if (isModKey && shift && key === 'z') command = 'redo';
        else if (isModKey && key === 'b') command = 'toggleLeft';
        else if (isModKey && key === 'i') command = 'toggleRight';
        else if (isModKey && key === 'k') command = 'openHelp';

        if (command) {
            event.preventDefault();
            dispatch(command);
        }
    };

    onMounted(() => window.addEventListener('keydown', handleKeyDown));
    onUnmounted(() => window.removeEventListener('keydown', handleKeyDown));
}