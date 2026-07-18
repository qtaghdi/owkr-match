import { describe, expect, it } from 'vitest';
import type { Player } from '../../types';
import {
    compareMentionedParticipants,
    extractMentionedParticipantNames,
} from './index';

const rank: Player['tank'] = {
    tier: 'DIAMOND',
    div: 3,
    score: 2800,
    isPreferred: false,
    isAvoided: false,
};

const createPlayer = (id: number, name: string, discordName?: string): Player => ({
    id,
    name,
    discordName,
    tank: rank,
    dps: rank,
    sup: rank,
});

describe('extractMentionedParticipantNames', () => {
    it('마크다운과 일반 텍스트 멘션을 순서대로 추출하고 중복을 제거한다', () => {
        const names = extractMentionedParticipantNames(
            '**@상만** **@에어맨이 쓰러지지 않아** @롤랑, **@상만** **@yog\\_1952**',
        );

        expect(names).toEqual(['상만', '에어맨이 쓰러지지 않아', '롤랑', 'yog_1952']);
    });
});

describe('compareMentionedParticipants', () => {
    it('디스코드 이름과 배틀태그 닉네임을 기준으로 미입력자를 찾는다', () => {
        const players = [
            createPlayer(1, 'PlayerOne#1234', '상만'),
            createPlayer(2, '롤랑#5678'),
            createPlayer(3, 'K200#31384', '미누'),
        ];

        const result = compareMentionedParticipants(
            '**@상만** **@롤랑** **@민성** **@미누** **@강아지**',
            players,
        );

        expect(result.mentionedNames).toEqual(['상만', '롤랑', '민성', '미누', '강아지']);
        expect(result.completedNames).toEqual(['상만', '롤랑', '미누']);
        expect(result.missingNames).toEqual(['민성', '강아지']);
    });

    it('대소문자, 유니코드 폭과 이름 내부 공백 차이를 정규화한다', () => {
        const players = [
            createPlayer(1, 'QUASAR#31909', 'Minha'),
            createPlayer(2, 'Player#1234', '에어맨이   쓰러지지 않아'),
        ];

        const result = compareMentionedParticipants(
            '**@ｍｉｎｈａ** **@에어맨이 쓰러지지 않아**',
            players,
        );

        expect(result.missingNames).toEqual([]);
    });
});
