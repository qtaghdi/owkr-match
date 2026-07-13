import type { Player } from '../../types';

interface PlayerIdentityProps {
    player: Player;
    align?: 'left' | 'right';
}

/**
 * @description 디스코드 표시 이름을 우선 보여주고 다른 배틀태그를 함께 표시한다.
 */
export const PlayerIdentity = ({ player, align = 'left' }: PlayerIdentityProps) => {
    const discordName = player.discordName?.trim();
    const hasDistinctDiscordName = Boolean(discordName)
        && discordName?.localeCompare(player.name, undefined, { sensitivity: 'accent' }) !== 0;

    return (
        <span className={`flex min-w-0 flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
            <span className="max-w-full truncate text-sm font-semibold text-slate-100">
                {hasDistinctDiscordName ? discordName : player.name}
            </span>
            {hasDistinctDiscordName && (
                <span className="max-w-full truncate text-[11px] font-normal text-slate-500">
                    {player.name}
                </span>
            )}
        </span>
    );
};
