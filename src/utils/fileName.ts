export function stripFileExtension(fileName: string): string {
    const trimmedName = fileName.trim();
    const extensionStart = trimmedName.lastIndexOf('.');

    if (extensionStart <= 0) {
        return trimmedName;
    }

    return trimmedName.slice(0, extensionStart) || trimmedName;
}
