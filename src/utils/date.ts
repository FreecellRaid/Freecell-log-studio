const DATE_PATTERNS = [
    // 兼容: 2026/05/20 14:30:05 或 2026/5/2 14:30:05
    {
        regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        map: (m: RegExpMatchArray) =>
            new Date(
                Number(m[1]),
                Number(m[2]) - 1,
                Number(m[3]),
                Number(m[4]),
                Number(m[5]),
                Number(m[6]),
            ),
    },
    // 兼容: 2026-05-20 14:30:05 或 2026-5-2 14:30:05
    {
        regex: /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        map: (m: RegExpMatchArray) =>
            new Date(
                Number(m[1]),
                Number(m[2]) - 1,
                Number(m[3]),
                Number(m[4]),
                Number(m[5]),
                Number(m[6]),
            ),
    },
    // （只有时间格式需补日期) 14:30:05
    {
        regex: /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
        map: (m: RegExpMatchArray, ref: Date) => {
            const d = new Date(ref);
            d.setHours(Number(m[1]), Number(m[2]), Number(m[3]), 0);
            return d;
        },
    },
];

// 各种时间=>Date
export function parseLogDate(
    dateStr: string,
    referenceDate: Date = new Date(),
): Date {
    const trimStr = dateStr.trim();

    const nativeDate = new Date(trimStr);
    if (!isNaN(nativeDate.getTime())) {
        return nativeDate;
    }

    for (const pattern of DATE_PATTERNS) {
        const match = trimStr.match(pattern.regex);
        if (match) {
            const result = pattern.map(match, referenceDate);
            if (!isNaN(result.getTime())) return result;
        }
    }

    console.warn(
        `[DateParser] 无法解析日期格式: "${dateStr}"，已回退到参考日期。`,
    );
    return referenceDate;
}

// Date=>2026/05/20 14:30:05
export function formatDate(date: Date, format = 'YYYY/MM/DD HH:mm:ss'): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    const pad = (n: number) => n.toString().padStart(2, '0');

    const map: Record<string, string> = {
        YYYY: date.getFullYear().toString(),
        MM: pad(date.getMonth() + 1),
        DD: pad(date.getDate()),
        HH: pad(date.getHours()),
        mm: pad(date.getMinutes()),
        ss: pad(date.getSeconds()),
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}
