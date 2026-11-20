'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  invalidateAvatarCache,
  loadAvatarObjectUrl,
  uploadMyAvatar,
} from '@/lib/avatar';

export function BackButton({ href = '/' }: { href?: string }) {
  return (
    <Link className="icon-btn" href={href} aria-label="뒤로">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function avatarGlyph(label: string) {
  const ch = (label || '?').trim().slice(0, 1) || '?';
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

function AvatarBubble({
  label,
  userId,
  hasAvatar,
  editable,
  onUpdated,
}: {
  label: string;
  userId?: string;
  hasAvatar?: boolean;
  editable?: boolean;
  onUpdated?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!userId || !hasAvatar) {
      setSrc(null);
      return;
    }
    void loadAvatarObjectUrl(userId).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, hasAvatar]);

  async function onPick(file: File | undefined) {
    if (!file || !editable || !userId) return;
    setBusy(true);
    setError('');
    try {
      await uploadMyAvatar(file);
      invalidateAvatarCache(userId);
      const url = await loadAvatarObjectUrl(userId);
      setSrc(url);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setBusy(false);
    }
  }

  const content = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="avatar-img" src={src} alt="" />
  ) : (
    avatarGlyph(label)
  );

  if (!editable) {
    return <div className="avatar">{content}</div>;
  }

  return (
    <div className="avatar-editable-wrap">
      <button
        type="button"
        className={`avatar avatar-editable${busy ? ' is-busy' : ''}`}
        aria-label="내 프로필 사진 변경"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {content}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          void onPick(file);
          e.currentTarget.value = '';
        }}
      />
      {error ? <span className="avatar-error">{error}</span> : null}
    </div>
  );
}

type AvatarPerson = {
  label: string;
  userId?: string;
  hasAvatar?: boolean;
};

/** 연결된 우리(아바타 + 하트 브릿지). 내 아바타만 터치해서 사진 변경 */
export function AvatarPair({
  left,
  right,
  meUserId,
  onMineUpdated,
}: {
  left: string | AvatarPerson;
  right: string | AvatarPerson;
  meUserId?: string;
  onMineUpdated?: () => void;
}) {
  const leftPerson: AvatarPerson =
    typeof left === 'string' ? { label: left } : left;
  const rightPerson: AvatarPerson =
    typeof right === 'string' ? { label: right } : right;

  return (
    <div className="avatar-pair">
      <AvatarBubble
        label={leftPerson.label}
        userId={leftPerson.userId}
        hasAvatar={leftPerson.hasAvatar}
        editable={Boolean(meUserId && leftPerson.userId === meUserId)}
        onUpdated={onMineUpdated}
      />
      <div className="avatar-bridge" aria-hidden>
        <div className="heart">♥</div>
      </div>
      <AvatarBubble
        label={rightPerson.label}
        userId={rightPerson.userId}
        hasAvatar={rightPerson.hasAvatar}
        editable={Boolean(meUserId && rightPerson.userId === meUserId)}
        onUpdated={onMineUpdated}
      />
    </div>
  );
}

export function BrandMark() {
  return (
    <div className="brand-mark">
      <span className="brand-dot" />
      서로
    </div>
  );
}
