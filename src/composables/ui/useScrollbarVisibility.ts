import { onMounted, onUnmounted } from 'vue';

const SCROLLBAR_VISIBLE_CLASS = 'scrollbar-visible';
const SCROLLBAR_VISIBLE_DURATION = 900;
export function useScrollbarVisibility() {
    let scrollbarVisibilityTimer: number | undefined;

    function showScrollbarWhileScrolling() {
        const root = document.documentElement;
        root.classList.add(SCROLLBAR_VISIBLE_CLASS);

        if (scrollbarVisibilityTimer !== undefined) {
            window.clearTimeout(scrollbarVisibilityTimer);
        }

        scrollbarVisibilityTimer = window.setTimeout(() => {
            root.classList.remove(SCROLLBAR_VISIBLE_CLASS);
        }, SCROLLBAR_VISIBLE_DURATION);
    }
    onMounted(() => {
        window.addEventListener('scroll', showScrollbarWhileScrolling, {
            passive: true,
            capture: true,
        });
    });
    onUnmounted(() => {
        window.removeEventListener('scroll', showScrollbarWhileScrolling, {
            capture: true,
        });
        if (scrollbarVisibilityTimer !== undefined) {
            window.clearTimeout(scrollbarVisibilityTimer);
        }
    });
}
