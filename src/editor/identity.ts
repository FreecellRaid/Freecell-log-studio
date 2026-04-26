import type { ColorMode } from '@/types/style';
import type { Message, RoleType } from '@/types/log';

export interface IdentityStat {
    count: number;
    role: RoleType;
}

export function getIdentityValue(message: Message, mode: ColorMode): string {
    return mode === 'playerName' ? message.playerName : message.account;
}

export function collectIdentityValues(
    messages: Message[],
    mode: ColorMode,
): string[] {
    const values: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < messages.length; i++) {
        const value = getIdentityValue(messages[i], mode);
        if (!value || seen.has(value)) {
            continue;
        }

        seen.add(value);
        values.push(value);
    }

    return values;
}

export function buildIdentityStats(
    messages: Message[],
    mode: ColorMode,
): Map<string, IdentityStat> {
    const stats = new Map<string, IdentityStat>();

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const value = getIdentityValue(message, mode);
        if (!value) {
            continue;
        }

        if (!stats.has(value)) {
            stats.set(value, { count: 0, role: message.role || 'pl' });
        }

        stats.get(value)!.count++;
    }

    return stats;
}

export function collectMessageIdsByIdentity(
    messages: Message[],
    mode: ColorMode,
    identity: string,
): Set<string> {
    const ids = new Set<string>();

    for (let i = 0; i < messages.length; i++) {
        if (getIdentityValue(messages[i], mode) === identity) {
            ids.add(messages[i].messageId);
        }
    }

    return ids;
}

export function findFirstRoleByIdentity(
    messages: Message[],
    mode: ColorMode,
    identity: string,
): RoleType | null {
    for (let i = 0; i < messages.length; i++) {
        if (getIdentityValue(messages[i], mode) === identity) {
            return messages[i].role;
        }
    }

    return null;
}
