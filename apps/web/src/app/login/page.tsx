'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';
import { syncLocalOnboardingToServer } from '@/lib/syncOnboarding';
import type { AuthResponse } from '@/lib/types';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/home';
  const from = params.get('from');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<AuthResponse>('/api/auth/login', {
        auth: false,
        body: { email, password },
      });
      setToken(res.accessToken);
      const me = await api<{ onboardingCompleted?: boolean }>('/api/auth/me');
      if (!me.onboardingCompleted) {
        const source =
          next.includes('/invite') || next.startsWith('/invite')
            ? 'INVITE'
            : from === 'onboarding'
              ? 'SELF'
              : 'SKIPPED';
        try {
          await syncLocalOnboardingToServer(source);
        } catch {
          // ignore
        }
      }
      if (next.startsWith('/') && next !== '/home') {
        router.replace(next);
        return;
      }
      const path = await goToNextStep('/home');
      router.replace(path);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '로그인에 실패했습니다. 이메일/비밀번호를 확인해 주세요.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">로그인</h1>
        <p className="muted">이어서 진행하려면 로그인하세요.</p>
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
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <Link className="btn btn-ghost" href="/reset-password">
        비밀번호 바꾸기
      </Link>
      <Link
        className="btn btn-ghost"
        href={`/register${next !== '/home' ? `?next=${encodeURIComponent(next)}` : ''}`}
      >
        회원가입
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
