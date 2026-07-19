import type { Player, Role } from '../../types';

interface RolePreference {
    isPreferred: boolean;
    isAvoided: boolean;
}

const ROLES: Role[] = ['TANK', 'DPS', 'SUPPORT'];

/**
 * @description 두 역할이 비선호일 때 남은 역할을 선호로 정규화한다.
 */
export const normalizeRolePreferences = <T extends RolePreference>(
    preferences: Record<Role, T>,
): Record<Role, T> => {
    const remainingRoles = ROLES.filter(role => !preferences[role].isAvoided);
    if (remainingRoles.length !== 1) return preferences;

    const remainingRole = remainingRoles[0];
    if (preferences[remainingRole].isPreferred) return preferences;

    return {
        ...preferences,
        [remainingRole]: {
            ...preferences[remainingRole],
            isPreferred: true,
        },
    };
};

/**
 * @description 플레이어의 세 역할 선호 상태에 자동 선호 규칙을 적용한다.
 */
export const normalizePlayerRolePreferences = (player: Player): Player => {
    const ranks = normalizeRolePreferences({
        TANK: player.tank,
        DPS: player.dps,
        SUPPORT: player.sup,
    });

    if (
        ranks.TANK === player.tank
        && ranks.DPS === player.dps
        && ranks.SUPPORT === player.sup
    ) {
        return player;
    }

    return {
        ...player,
        tank: ranks.TANK,
        dps: ranks.DPS,
        sup: ranks.SUPPORT,
    };
};
