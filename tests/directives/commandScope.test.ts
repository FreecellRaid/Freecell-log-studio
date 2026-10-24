import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { DirectiveBinding, VNode } from 'vue';
import type { CommandContext } from '@/types/commandContext';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { vCommandScope } from '@/directives/commandScope';

const windows = vi.hoisted(() => ({ blockingModal: false, setFocus: vi.fn() }));
vi.mock('@/stores/ui/windowStore', () => ({ useWindowStore: () => windows }));

class ScopeElement extends EventTarget {
    closestScope: ScopeElement = this;
    closest() {
        return this.closestScope;
    }
    setAttribute() {}
    removeAttribute() {}
}

function lifecycle(
    name: 'mounted' | 'updated' | 'unmounted',
    element: ScopeElement,
    context: CommandContext,
) {
    const args = [
        element as unknown as HTMLElement,
        { value: context } as DirectiveBinding<CommandContext>,
        {} as VNode<Node, HTMLElement>,
    ] as const;
    // Vue 的 updated 接收旧 VNode，其余两个生命周期接收 null。
    if (name === 'updated') vCommandScope.updated?.(...args, args[2]);
    else if (name === 'mounted') vCommandScope.mounted?.(...args, null);
    else vCommandScope.unmounted?.(...args, null);
}

describe('command scopes', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.stubGlobal('Element', ScopeElement);
        windows.blockingModal = false;
        windows.setFocus.mockClear();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('activates on keyboard focus as well as pointer interaction', () => {
        const scene = new ScopeElement();
        const search = new ScopeElement();
        const sceneContext: CommandContext = {
            area: 'scene',
            windowId: 'view',
            chunkId: 'chunk',
        };
        const searchContext: CommandContext = {
            area: 'panel',
            panel: 'search',
        };
        lifecycle('mounted', scene, sceneContext);
        lifecycle('mounted', search, searchContext);
        scene.dispatchEvent(new Event('pointerdown'));
        expect(useCommandContextStore().current).toEqual(sceneContext);
        search.dispatchEvent(new Event('focusin'));
        expect(useCommandContextStore().current).toEqual(searchContext);
        expect(windows.setFocus).toHaveBeenLastCalledWith('search');
    });

    it('uses updated targets and removes listeners when unmounted', () => {
        const element = new ScopeElement();
        const first: CommandContext = {
            area: 'scene',
            windowId: 'view',
            chunkId: 'old',
        };
        const next: CommandContext = { ...first, chunkId: 'new' };
        lifecycle('mounted', element, first);
        lifecycle('updated', element, next);
        element.dispatchEvent(new Event('focusin'));
        expect(useCommandContextStore().current).toEqual(next);
        lifecycle('unmounted', element, next);
        useCommandContextStore().activate({
            area: 'empty',
            windowId: 'defaultView',
        });
        element.dispatchEvent(new Event('pointerdown'));
        element.dispatchEvent(new Event('focusin'));
        expect(useCommandContextStore().current.area).toBe('empty');
    });

    it('does not steal a nested scope or modal command context', () => {
        const element = new ScopeElement();
        const context: CommandContext = { area: 'panel', panel: 'search' };
        lifecycle('mounted', element, context);
        element.closestScope = new ScopeElement();
        element.dispatchEvent(new Event('focusin'));
        expect(windows.setFocus).not.toHaveBeenCalled();
        element.closestScope = element;
        windows.blockingModal = true;
        element.dispatchEvent(new Event('pointerdown'));
        element.dispatchEvent(new Event('focusin'));
        expect(windows.setFocus).not.toHaveBeenCalled();
        expect(useCommandContextStore().current.area).toBe('empty');
    });
});
