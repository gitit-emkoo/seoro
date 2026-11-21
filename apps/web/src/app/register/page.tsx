'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';
import { syncLocalOnboardingToServer } from '@/lib/syncOnboarding';
import type { AuthResponse } from '@/lib/types';

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete = 'new-password',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={8}
          required
        />
        <button
          className="password-toggle"
          type="button"
          onClick={onToggleShow}
          aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
          aria-pressed={show}
        >
          {show ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/home';
  const from = params.get('from');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('비밀번호가 서로 다릅니다. 다시 확인해 주세요.');
      return;
    }
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
        <PasswordInput
          id="password"
          label="비밀번호 (8자 이상)"
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
        />
        <PasswordInput
          id="passwordConfirm"
          label="비밀번호 확인"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          show={showPasswordConfirm}
          onToggleShow={() => setShowPasswordConfirm((v) => !v)}
        />
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
