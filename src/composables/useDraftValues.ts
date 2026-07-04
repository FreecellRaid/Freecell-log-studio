import { reactive } from 'vue';

type DraftInputElement = HTMLInputElement | HTMLTextAreaElement;

export function useDraftValues<Field extends string>() {
    const values = reactive<Record<string, string>>({});

    function getKey(entityId: string, field: Field) {
        return `${entityId}:${field}`;
    }

    function getValue(entityId: string, field: Field, fallback: string) {
        return values[getKey(entityId, field)] ?? fallback;
    }

    function update(entityId: string, field: Field, event: Event) {
        values[getKey(entityId, field)] = (
            event.target as DraftInputElement
        ).value;
    }

    function commit(
        entityId: string,
        field: Field,
        apply: (value: string) => void,
    ) {
        const key = getKey(entityId, field);
        if (!(key in values)) return;

        apply(values[key]);
        delete values[key];
    }

    return {
        getValue,
        update,
        commit,
    };
}
