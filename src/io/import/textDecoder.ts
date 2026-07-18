export interface DecodedText {
    text: string;
    encoding: string;
    confidence: number;
}

const ENCODING_LABELS: Record<string, string> = {
    ascii: 'utf-8',
    big5: 'big5',
    eucjp: 'euc-jp',
    euckr: 'euc-kr',
    gb18030: 'gb18030',
    gb2312: 'gb18030',
    hzgb2312: 'gb18030',
    iso2022jp: 'iso-2022-jp',
    iso88592: 'iso-8859-2',
    iso88595: 'iso-8859-5',
    iso88597: 'iso-8859-7',
    iso88598: 'iso-8859-8',
    koi8r: 'koi8-r',
    shiftjis: 'shift_jis',
    tis620: 'tis-620',
    utf16be: 'utf-16be',
    utf16le: 'utf-16le',
    utf8: 'utf-8',
    windows1250: 'windows-1250',
    windows1251: 'windows-1251',
    windows1252: 'windows-1252',
    windows1253: 'windows-1253',
    windows1255: 'windows-1255',
};

function normalizeEncodingName(encoding: string): string {
    return encoding.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectBom(bytes: Uint8Array): string | null {
    if (
        (bytes[0] === 0xff &&
            bytes[1] === 0xfe &&
            bytes[2] === 0x00 &&
            bytes[3] === 0x00) ||
        (bytes[0] === 0x00 &&
            bytes[1] === 0x00 &&
            bytes[2] === 0xfe &&
            bytes[3] === 0xff)
    ) {
        throw new Error('暂不支持转换 UTF-32 编码文件，请先另存为 UTF-8。');
    }
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return 'utf-8';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
    return null;
}

function isValidUtf8(bytes: Uint8Array): boolean {
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        return true;
    } catch {
        return false;
    }
}

// 转二进制，分块处理避免超过 jschardet 的上限
function toBinaryString(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    const chunks: string[] = [];
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        chunks.push(
            String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)),
        );
    }
    return chunks.join('');
}

export async function decodeText(bytes: Uint8Array): Promise<DecodedText> {
    // UTF-8 可被浏览器直接检测，优先用这个
    if (isValidUtf8(bytes)) {
        return {
            text: new TextDecoder('utf-8').decode(bytes),
            encoding: 'utf-8',
            confidence: 1,
        };
    }

    const bomEncoding = detectBom(bytes);
    if (bomEncoding) {
        return {
            text: new TextDecoder(bomEncoding).decode(bytes),
            encoding: bomEncoding,
            confidence: 1,
        };
    }

    // 绝大多数文件都是 UTF-8，遇到检测不了的再导入，优化首屏加载
    const { detect } = await import('jschardet');
    const detected = detect(toBinaryString(bytes));
    const detectedName = detected.encoding || '';
    const decoderLabel = ENCODING_LABELS[normalizeEncodingName(detectedName)];
    if (!decoderLabel) {
        throw new Error(
            detectedName
                ? `检测到编码 ${detectedName}，但浏览器不支持转换该编码。`
                : '无法检测文件编码。',
        );
    }

    try {
        return {
            text: new TextDecoder(decoderLabel).decode(bytes),
            encoding: detectedName,
            confidence: detected.confidence,
        };
    } catch {
        throw new Error(`当前浏览器不支持转换编码 ${detectedName}。`);
    }
}

export async function readFileAsText(file: File): Promise<DecodedText> {
    return await decodeText(new Uint8Array(await file.arrayBuffer()));
}
