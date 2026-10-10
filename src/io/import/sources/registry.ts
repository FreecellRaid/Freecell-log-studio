import { sealdiceSource } from './sealdiceSource';
import { olivaSource } from './olivaSource';
import { directUrlSource } from './directUrlSource';
import type { LogSourceAdapter } from './types';

// 新来源只需实现 LogSourceAdapter 并加入注册表。
export const LOG_SOURCES: readonly LogSourceAdapter[] = [
    olivaSource,
    sealdiceSource,
    directUrlSource,
];

export function getLogSource(id: string): LogSourceAdapter {
    const source = LOG_SOURCES.find((source) => source.id === id);
    if (!source) throw new Error(`不支持的日志来源：${id}`);
    return source;
}
