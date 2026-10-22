import { inflateRawSync } from 'node:zlib';

// 读取真实 DOCX 的 ZIP 中央目录，不依赖导出器内部对象或快照字符串。
export async function docxEntries(blob: Blob): Promise<Map<string, Buffer>> {
    const bytes = Buffer.from(await blob.arrayBuffer());
    let end = bytes.length - 22;
    while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--;
    if (end < 0) throw new Error('无效 ZIP 文件');
    let offset = bytes.readUInt32LE(end + 16);
    const count = bytes.readUInt16LE(end + 10);
    const entries = new Map<string, Buffer>();
    for (let i = 0; i < count; i++) {
        if (bytes.readUInt32LE(offset) !== 0x02014b50)
            throw new Error('无效 ZIP 目录');
        const method = bytes.readUInt16LE(offset + 10);
        const size = bytes.readUInt32LE(offset + 20);
        const nameLength = bytes.readUInt16LE(offset + 28);
        const extraLength = bytes.readUInt16LE(offset + 30);
        const commentLength = bytes.readUInt16LE(offset + 32);
        const local = bytes.readUInt32LE(offset + 42);
        const name = bytes
            .subarray(offset + 46, offset + 46 + nameLength)
            .toString();
        const start =
            local +
            30 +
            bytes.readUInt16LE(local + 26) +
            bytes.readUInt16LE(local + 28);
        const data = bytes.subarray(start, start + size);
        entries.set(name, method === 8 ? inflateRawSync(data) : data);
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}
