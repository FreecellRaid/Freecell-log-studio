// 只缓存正在显示的图片，最后一个使用者释放时立即撤销 URL。
export function createImageUrlCache(
    create = (blob: Blob) => URL.createObjectURL(blob),
    revoke = (url: string) => URL.revokeObjectURL(url),
) {
    const entries = new Map<string, { url: string; users: number }>();
    return {
        acquire(key: string, blob: Blob) {
            let entry = entries.get(key);
            if (!entry) {
                entry = { url: create(blob), users: 0 };
                entries.set(key, entry);
            }
            entry.users++;
            const current = entry;
            let released = false;
            return {
                url: entry.url,
                release() {
                    if (released) return;
                    released = true;
                    if (--current.users === 0) {
                        entries.delete(key);
                        revoke(current.url);
                    }
                },
            };
        },
    };
}
export const imageUrlCache = createImageUrlCache();
