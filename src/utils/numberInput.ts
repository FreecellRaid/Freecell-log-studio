export interface NumberInputRange {
    min?: number;
    max?: number;
    step?: number;
}

export function normalizeNumberInput(
    value: number,
    {
        min = -Number.MAX_SAFE_INTEGER,
        max = Number.MAX_SAFE_INTEGER,
        step = 1,
    }: NumberInputRange = {},
    fallback = 0,
): number {
    const increment = Number.isFinite(step) && step > 0 ? step : 1;
    const base = min === -Number.MAX_SAFE_INTEGER ? 0 : min;
    const candidate = Number.isNaN(value)
        ? Number.isFinite(fallback)
            ? fallback
            : 0
        : value;
    const clamped = Math.min(max, Math.max(min, candidate));
    const lowest = Math.ceil((min - base) / increment);
    const highest = Math.floor((max - base) / increment + 1e-10);
    const index = Math.min(
        highest,
        Math.max(lowest, Math.round((clamped - base) / increment)),
    );
    // 消除小数步长计算产生的浮点尾差。
    return Math.min(
        max,
        Math.max(min, Number((base + index * increment).toPrecision(16))),
    );
}
