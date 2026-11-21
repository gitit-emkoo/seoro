'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';
import {
  EMOTIONS,
  MAX_TRIGGERS,
  TRIGGERS,
  emotionMeta,
  kstToday,
  triggerLabel,
  type EmotionCode,
  type EmotionDiary,
  type TriggerCode,
} from '@/lib/diary';
import type { CoupleRoom } from '@/lib/types';

export default function DiaryWritePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<EmotionDiary | null>(null);
  const [emotionCode, setEmotionCode] = useState<EmotionCode | null>(null);
  const [triggerCodes, setTriggerCodes] = useState<TriggerCode[]>([]);
  const [comment, setComment] = useState('');
  const today = kstToday();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        const room = await api<CoupleRoom | null>('/api/couples/me');
        if (!room || room.status !== 'ACTIVE') {
          router.replace('/home');
          return;
        }
        const row = await api<EmotionDiary | null>(`/api/diaries/${today}`);
        if (row) {
          setExisting(row);
          setEmotionCode(row.emotionCode as EmotionCode);
          setTriggerCodes(row.triggerCodes as TriggerCode[]);
          setComment(row.comment ?? '');
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
        setReady(true);
      }
    })();
  }, [router, today]);

  function toggleTrigger(code: TriggerCode) {
    setTriggerCodes((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_TRIGGERS) {
        setError(`트리거는 최대 ${MAX_TRIGGERS}개까지 선택할 수 있어요.`);
        return prev;
      }
      setError('');
      return [...prev, code];
    });
  }

  async function save() {
    if (!emotionCode) {
      setError('오늘의 감정을 골라 주세요.');
      return;
    }
    if (!triggerCodes.length) {
      setError('트리거를 하나 이상 골라 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await api<EmotionDiary>('/api/diaries', {
        body: {
          entryDate: today,
          emotionCode,
          triggerCodes,
          comment,
        },
      });
      setExisting(saved);
      router.push('/diary/calendar');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <LoadingBlock message="감정 일기를 준비하는 중…" />;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/home" />
        <BrandMark />
        <Link className="btn-chip btn" href="/diary/calendar">
          캘린더
        </Link>
      </div>

      <section className="stack">
        <h1 className="hero-title">오늘의 감정</h1>
        <p className="muted">{today} · 하루 한 번, 짧게 남겨 보세요.</p>
      </section>

      <section className="stack">
        <h2 className="diary-section-title">지금은 어떤 기분인가요?</h2>
        <div className="diary-emotion-row">
          {EMOTIONS.map((e) => {
            const on = emotionCode === e.code;
            return (
              <button
                key={e.code}
                type="button"
                className={on ? 'diary-emotion diary-emotion-on' : 'diary-emotion'}
                onClick={() => setEmotionCode(e.code)}
              >
                <span className="diary-emotion-dot" style={{ background: e.color }} />
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2 className="diary-section-title">무엇과 관련이 있나요? (최대 {MAX_TRIGGERS}개)</h2>
        {triggerCodes.length ? (
          <div className="diary-chips">
            {triggerCodes.map((code) => (
              <button
                key={code}
                type="button"
                className="diary-chip"
                onClick={() => toggleTrigger(code)}
              >
                {triggerLabel(code)} ×
              </button>
            ))}
          </div>
        ) : null}
        <div className="diary-trigger-grid">
          {TRIGGERS.map((t) => {
            const on = triggerCodes.includes(t.code);
            return (
              <button
                key={t.code}
                type="button"
                className={on ? 'diary-trigger diary-trigger-on' : 'diary-trigger'}
                onClick={() => toggleTrigger(t.code)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2 className="diary-section-title">한 줄 메모 (나만 보여요)</h2>
        <textarea
          className="diary-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="상대에게는 보이지 않는 짧은 기록"
          maxLength={2000}
        />
      </section>

      {emotionCode ? (
        <div className="card-soft stack">
          <strong>미리보기</strong>
          <p className="muted">
            {emotionMeta(emotionCode).label}
            {triggerCodes.length
              ? ` · ${triggerCodes.map(triggerLabel).join(', ')}`
              : ''}
          </p>
          {comment.trim() ? <p style={{ whiteSpace: 'pre-wrap' }}>{comment}</p> : null}
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save()}>
        {busy ? '저장 중…' : existing ? '오늘 일기 수정' : '저장하기'}
      </button>
    </main>
  );
}
