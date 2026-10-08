import type { ImportTextEntry } from '@/types/import';

export interface RemoteLogRequest {
    source: string;
    id?: string;
    url?: string;
    format?: string;
}

export interface RemoteSourceContext {
    readText: (url: string) => Promise<string>;
}

export interface LogSourceAdapter {
    id: string;
    load: (
        request: RemoteLogRequest,
        context: RemoteSourceContext,
    ) => Promise<ImportTextEntry>;
}
