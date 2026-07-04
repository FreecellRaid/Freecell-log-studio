import type { Directive } from 'vue';
import { onClickOutside } from '@vueuse/core';

type ClickOutsideHandler = (event: PointerEvent) => void;

const clickOutsideStops = new WeakMap<HTMLElement, () => void>();

export const vClickOutside: Directive<HTMLElement, ClickOutsideHandler> = {
    mounted(el, binding) {
        clickOutsideStops.set(el, onClickOutside(el, binding.value));
    },
    updated(el, binding) {
        clickOutsideStops.get(el)?.();
        clickOutsideStops.set(el, onClickOutside(el, binding.value));
    },
    unmounted(el) {
        clickOutsideStops.get(el)?.();
        clickOutsideStops.delete(el);
    },
};
