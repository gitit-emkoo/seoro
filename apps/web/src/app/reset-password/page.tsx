'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { api } from '@/lib/api';

/** 테스트용 비밀번호 재설정 (이메일 인증 없음) */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      const res = await api<{ message: string }>('/api/auth/reset-password', {
        auth: false,
        body: { email, newPassword },
      });
      setOk(res.message || '비밀번호가 변경되었습니다.');
      setTimeout(() => router.replace('/login'), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/login" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">비밀번호 바꾸기</h1>
        <p className="muted">테스트용입니다. 가입 이메일과 새 비밀번호만 입력하세요.</p>
      </section>

      <form className="card stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="newPassword">새 비밀번호</label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        {ok ? <p className="muted">{ok}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>

      <Link className="btn btn-ghost" href="/login">
        로그인으로
      </Link>
    </main>
  );
}
