export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const randomNum = (Math.random() * 16) | 0;
        const v = c === 'x' ? randomNum : (randomNum & 0x3) | 0x8;
        return v.toString(16);
    });
}
