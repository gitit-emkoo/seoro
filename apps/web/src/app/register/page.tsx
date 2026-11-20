'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';
import { syncLocalOnboardingToServer } from '@/lib/syncOnboarding';
import type { AuthResponse } from '@/lib/types';

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/home';
  const from = params.get('from');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<AuthResponse>('/api/auth/register', {
        auth: false,
        body: { name: name || undefined, email, password },
      });
      setToken(res.accessToken);
      const source =
        next.includes('/invite') || next.startsWith('/invite')
          ? 'INVITE'
          : from === 'onboarding'
            ? 'SELF'
            : 'SKIPPED';
      try {
        await syncLocalOnboardingToServer(source);
      } catch {
        // 온보딩 동기화 실패해도 가입은 유지. 다음 접속 시 보완.
      }
      if (next.startsWith('/') && next !== '/home') {
        router.replace(next);
        return;
      }
      const path = await goToNextStep('/home');
      router.replace(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다. 이메일/비밀번호를 확인해 주세요.');
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
        <h1 className="hero-title">회원가입</h1>
        <p className="muted">이메일과 비밀번호만으로 시작할 수 있어요.</p>
      </section>

      <form className="card stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">이름 (선택)</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
        </div>
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
          <label htmlFor="password">비밀번호 (8자 이상)</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '가입 중…' : '가입하고 계속하기'}
        </button>
      </form>

      <Link className="btn btn-ghost" href={`/login${next !== '/home' ? `?next=${encodeURIComponent(next)}` : ''}`}>
        이미 계정이 있나요? 로그인
      </Link>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
