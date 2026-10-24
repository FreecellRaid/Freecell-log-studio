import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShortcutHandlers } from '@/composables/interaction/useKeyboardShortcuts';

class ElementStub {
    isContentEditable = false;
}
class InputStub extends ElementStub {}
class TextareaStub extends ElementStub {}
class SelectStub extends ElementStub {}

function keyEvent(key: string, options: Record<string, unknown> = {}) {
    return {
        key,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        isComposing: false,
        defaultPrevented: false,
        target: new ElementStub(),
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...options,
    } as unknown as KeyboardEvent;
}

describe('keyboard shortcut boundaries', () => {
    beforeEach(() => {
        vi.stubGlobal('HTMLElement', ElementStub);
        vi.stubGlobal('HTMLInputElement', InputStub);
        vi.stubGlobal('HTMLTextAreaElement', TextareaStub);
        vi.stubGlobal('HTMLSelectElement', SelectStub);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('keeps text editing and form control keys native', () => {
        const dispatch = vi.fn();
        const { handleKeyDown } = createShortcutHandlers(dispatch);
        for (const target of [
            new InputStub(),
            new TextareaStub(),
            new SelectStub(),
            Object.assign(new ElementStub(), { isContentEditable: true }),
        ]) {
            for (const key of ['a', 'c', 'z', 'backspace', 'enter']) {
                const event = keyEvent(key, {
                    target,
                    ctrlKey: key !== 'enter',
                });
                handleKeyDown(event);
                expect(event.preventDefault).not.toHaveBeenCalled();
            }
        }
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('ignores composing and already handled events in both shortcut paths', () => {
        const dispatch = vi.fn();
        const { handleKeyDown, handleBrowserShortcut } =
            createShortcutHandlers(dispatch);
        for (const options of [
            { isComposing: true },
            { defaultPrevented: true },
        ]) {
            handleKeyDown(keyEvent('enter', options));
            handleKeyDown(keyEvent('a', { ctrlKey: true, ...options }));
            handleBrowserShortcut(keyEvent('f', { ctrlKey: true, ...options }));
        }
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('maps Ctrl and Command shortcuts to the same business commands', () => {
        const dispatch = vi.fn();
        const { handleKeyDown } = createShortcutHandlers(dispatch);
        for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
            const event = keyEvent('a', modifier);
            handleKeyDown(event);
            expect(dispatch).toHaveBeenLastCalledWith('selectAll');
            expect(event.preventDefault).toHaveBeenCalledOnce();
        }
        const unknown = keyEvent('q');
        handleKeyDown(unknown);
        expect(unknown.preventDefault).not.toHaveBeenCalled();
    });

    it('preserves capture-phase search and replacement shortcuts inside inputs', () => {
        const dispatch = vi.fn();
        const { handleBrowserShortcut } = createShortcutHandlers(dispatch);
        handleBrowserShortcut(
            keyEvent('f', { ctrlKey: true, target: new InputStub() }),
        );
        expect(dispatch).toHaveBeenLastCalledWith('openSearch');
        handleBrowserShortcut(
            keyEvent('h', { ctrlKey: true, target: new TextareaStub() }),
        );
        expect(dispatch).toHaveBeenLastCalledWith('replace');
        handleBrowserShortcut(keyEvent('f', { metaKey: true, altKey: true }));
        expect(dispatch).toHaveBeenLastCalledWith('replace');
    });
});
