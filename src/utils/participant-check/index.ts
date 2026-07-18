import type { Player } from '../../types';

export interface ParticipantCheckResult {
    mentionedNames: string[];
    completedNames: string[];
    missingNames: string[];
}

/**
 * @description 디스코드 표시 이름을 멘션 대조에 사용할 수 있는 형태로 정규화한다.
 */
const normalizeParticipantIdentity = (value: string): string => value
    .normalize('NFKC')
    .replace(/\\([_*~`])/g, '$1')
    .replace(/^[\s@*]+|[\s*,，、;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ko-KR');

/**
 * @description 굵은 글씨 또는 일반 텍스트로 복사된 디스코드 멘션에서 표시 이름을 추출한다.
 */
export const extractMentionedParticipantNames = (text: string): string[] => {
    const mentionPattern = /\*\*\s*@([^*\n]+?)\s*\*\*|(?:^|[\s,])@([^\s,*]+)/gmu;
    const names: string[] = [];
    const seenNames = new Set<string>();

    for (const match of text.matchAll(mentionPattern)) {
        const name = (match[1] ?? match[2] ?? '')
            .replace(/\\([_*~`])/g, '$1')
            .replace(/[\s,，、;]+$/g, '')
            .trim();
        const normalizedName = normalizeParticipantIdentity(name);

        if (!normalizedName || seenNames.has(normalizedName)) continue;
        names.push(name);
        seenNames.add(normalizedName);
    }

    return names;
};

/**
 * @description 멘션된 참가자를 현재 플레이어의 디스코드 이름과 배틀태그에 대조한다.
 */
export const compareMentionedParticipants = (
    text: string,
    players: Player[],
): ParticipantCheckResult => {
    const mentionedNames = extractMentionedParticipantNames(text);
    const enteredIdentities = new Set<string>();

    for (const player of players) {
        const identities = [
            player.discordName,
            player.name,
            player.name.split('#')[0],
        ];

        for (const identity of identities) {
            if (!identity) continue;
            const normalizedIdentity = normalizeParticipantIdentity(identity);
            if (normalizedIdentity) enteredIdentities.add(normalizedIdentity);
        }
    }

    const completedNames = mentionedNames.filter(name => (
        enteredIdentities.has(normalizeParticipantIdentity(name))
    ));
    const missingNames = mentionedNames.filter(name => (
        !enteredIdentities.has(normalizeParticipantIdentity(name))
    ));

    return { mentionedNames, completedNames, missingNames };
};
