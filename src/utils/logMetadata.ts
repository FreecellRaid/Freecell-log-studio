// 元信息遵循日志 JSON 协议；JSON 克隆也支持 Pinia 包装后的响应式对象。
export function cloneLogMetadata(
    value: Record<string, unknown>,
): Record<string, unknown> {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
