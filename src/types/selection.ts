export type SelectionScope =
    | { kind: 'scene'; chunkId: string }
    | { kind: 'search' }
    | { kind: 'chunkList' }
    | { kind: 'resources' }
    | { kind: 'none' };

export function selectionScopeKey(scope: SelectionScope): string {
    return scope.kind === 'scene'
        ? JSON.stringify(['scene', scope.chunkId])
        : scope.kind;
}
