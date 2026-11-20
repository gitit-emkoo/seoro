import { getToken } from '@/lib/api';

const cache = new Map<string, string>();

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(
  /\/$/,
  '',
);

/** 인증된 아바타 이미지를 blob URL로 불러옵니다. */
export async function loadAvatarObjectUrl(userId: string): Promise<string | null> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${apiBase}/api/auth/avatar/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  cache.set(userId, url);
  return url;
}

export function invalidateAvatarCache(userId: string) {
  const prev = cache.get(userId);
  if (prev) URL.revokeObjectURL(prev);
  cache.delete(userId);
}

export async function uploadMyAvatar(file: File) {
  const token = getToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${apiBase}/api/auth/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || '사진 업로드에 실패했습니다.');
  }
  return data as { id: string; hasAvatar: boolean };
}
