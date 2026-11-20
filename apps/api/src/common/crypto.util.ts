import { createHash, randomBytes, randomInt } from 'crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

/** 사람이 입력하기 쉬운 8자리 초대번호 (숫자) */
export function generateInvitationCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0');
}
