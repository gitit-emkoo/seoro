'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { ErrorBlock, LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';

type Preview = {
  usable: boolean;
  status: string;
  expiresAt: string;
  maskedCode: string;
  principles: string[];
};

function InviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const codeFromQuery = params.get('code') || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [invitationCode, setInvitationCode] = useState(codeFromQuery);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const previewQuery = useMemo(() => {
    if (token) return `token=${encodeURIComponent(token)}`;
    if (codeFromQuery) return `code=${encodeURIComponent(codeFromQuery)}`;
    return '';
  }, [token, codeFromQuery]);

  useEffect(() => {
    if (!previewQuery) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/couples/invites/preview?${previewQuery}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || '초대를 확인할 수 없습니다.');
        setPreview(data);
        if (!invitationCode && codeFromQuery) setInvitationCode(codeFromQuery);
      } catch (err) {
        setError(err instanceof Error ? err.message : '초대 확인 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [previewQuery, codeFromQuery, invitationCode]);

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!getToken()) {
        const next = token
          ? `/invite?token=${encodeURIComponent(token)}`
          : `/invite?code=${encodeURIComponent(invitationCode)}`;
        router.push(`/register?next=${encodeURIComponent(next)}`);
        return;
      }
      await api('/api/couples/join', {
        body: token ? { token } : { invitationCode },
      });
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock message="초대 정보를 확인하는 중…" />;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <Link className="btn-chip btn" href="/login">
          로그인
        </Link>
      </div>

      <section className="stack">
        <h1 className="hero-title">함께할 사람을 위한 초대가 도착했습니다</h1>
        <p className="muted">
          서로는 한 사람만 상대를 확인하는 서비스가 아닙니다. 두 사람이 같은
          기준으로 함께 확인합니다.
        </p>
      </section>

      <section className="card stack">
        {(preview?.principles || [
          '한 사람만 확인하는 구조가 아닙니다.',
          '두 사람이 같은 기준으로 함께 확인합니다.',
          '서로의 자료는 동의 없이 공개되지 않습니다.',
        ]).map((line) => (
          <div className="list-card" key={line}>
            <div className="icon-bubble">✓</div>
            <div className="label" style={{ fontWeight: 600 }}>
              {line}
            </div>
          </div>
        ))}
      </section>

      {preview && !preview.usable ? (
        <ErrorBlock
          message={
            preview.status === 'EXPIRED'
              ? '만료된 초대입니다. 상대방에게 새 초대를 요청해 주세요.'
              : preview.status === 'USED' || preview.status === 'REVOKED'
                ? '이미 사용되었거나 재발급되어 더 이상 쓸 수 없는 초대입니다.'
                : '지금은 이 초대로 참여할 수 없습니다.'
          }
        />
      ) : (
        <form className="card stack" onSubmit={join}>
          {!token ? (
            <div className="field">
              <label htmlFor="code">초대 인증번호</label>
              <input
                id="code"
                inputMode="numeric"
                maxLength={8}
                value={invitationCode}
                onChange={(e) =>
                  setInvitationCode(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                placeholder="8자리 숫자"
                required
              />
            </div>
          ) : (
            <p className="muted">
              초대 링크로 확인되었습니다
              {preview?.maskedCode ? ` · 번호 ${preview.maskedCode}` : ''}.
            </p>
          )}
          {preview?.expiresAt ? (
            <div className="meta">
              <span>만료</span>
              <span>{new Date(preview.expiresAt).toLocaleString('ko-KR')}</span>
            </div>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy
              ? '처리 중…'
              : getToken()
                ? '초대받은 공간에 참여하기'
                : '가입하고 참여하기'}
          </button>
          {getToken() ? null : (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                const next = token
                  ? `/invite?token=${encodeURIComponent(token)}`
                  : `/invite?code=${encodeURIComponent(invitationCode)}`;
                router.push(`/login?next=${encodeURIComponent(next)}`);
              }}
            >
              이미 계정이 있어요
            </button>
          )}
        </form>
      )}
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <InviteContent />
    </Suspense>
  );
}
