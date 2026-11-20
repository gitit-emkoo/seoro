const TOKEN_KEY = 'seoro_invite_token';
const CODE_KEY = 'seoro_invite_code';

export function saveInviteSession(token: string, code: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(CODE_KEY, code);
}

export function getInviteToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getInviteCode(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(CODE_KEY);
}

export function buildInviteUrl(token: string) {
  if (typeof window === 'undefined') return `/invite?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
