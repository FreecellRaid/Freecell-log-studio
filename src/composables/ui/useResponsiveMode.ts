import { computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';

export function useResponsiveMode() {
    const mobileQuery = useMediaQuery(
        '(max-width: 768px), (pointer: coarse) and (max-width: 1024px)',
    );

    const isMobile = computed(() => mobileQuery.value);

    return {
        isMobile,
    };
}
