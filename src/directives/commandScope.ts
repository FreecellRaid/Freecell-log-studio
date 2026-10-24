import type { ObjectDirective } from 'vue';
import type { CommandContext } from '@/types/commandContext';
import { commandContextOwner } from '@/types/commandContext';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useWindowStore } from '@/stores/ui/windowStore';

const scopes = new WeakMap<
    HTMLElement,
    {
        context: CommandContext;
        activate: (event: Event) => void;
    }
>();
const listenerOptions = { capture: true };

// 捕获阶段先激活区域，保证子组件立即执行的命令使用正确目标。
// focusin 同时覆盖 Tab 和程序调用 focus()，不只跟随鼠标。
export const vCommandScope: ObjectDirective<HTMLElement, CommandContext> = {
    mounted(element, binding) {
        const windows = useWindowStore();
        const commands = useCommandContextStore();
        const scope = {
            context: binding.value,
            activate(event: Event) {
                const target = event.target;
                if (
                    target instanceof Element &&
                    target.closest('[data-command-scope]') !== element
                )
                    return;
                if (windows.blockingModal) return;
                // 兼容原有布局和焦点样式，后续阶段可移除窗口依赖。
                windows.setFocus(commandContextOwner(scope.context));
                commands.activate(scope.context);
            },
        };
        scopes.set(element, scope);
        element.setAttribute('data-command-scope', '');
        element.addEventListener(
            'pointerdown',
            scope.activate,
            listenerOptions,
        );
        element.addEventListener('focusin', scope.activate, listenerOptions);
    },
    updated(element, binding) {
        const scope = scopes.get(element);
        if (scope) scope.context = binding.value;
    },
    unmounted(element) {
        const scope = scopes.get(element);
        if (!scope) return;
        element.removeEventListener(
            'pointerdown',
            scope.activate,
            listenerOptions,
        );
        element.removeEventListener('focusin', scope.activate, listenerOptions);
        element.removeAttribute('data-command-scope');
        scopes.delete(element);
    },
};
