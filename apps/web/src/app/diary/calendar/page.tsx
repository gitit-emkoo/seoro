'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { LoadingBlock } from '@/components/StateBlock';
import { api, getToken } from '@/lib/api';
import {
  emotionMeta,
  kstToday,
  monthRange,
  triggerLabel,
  type EmotionDiary,
} from '@/lib/diary';
import type { CoupleRoom } from '@/lib/types';

export default function DiaryCalendarPage() {
  const router = useRouter();
  const today = kstToday();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month0: m - 1 };
  });
  const [rows, setRows] = useState<EmotionDiary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  async function loadMonth(year: number, month0: number) {
    const { from, to } = monthRange(year, month0);
    const list = await api<EmotionDiary[]>(
      `/api/diaries?scope=both&from=${from}&to=${to}`,
    );
    setRows(list);
  }

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
        await loadMonth(cursor.year, cursor.month0);
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
        setReady(true);
      }
    })();
  }, [router, cursor.year, cursor.month0]);

  const byDate = useMemo(() => {
    const map = new Map<string, EmotionDiary[]>();
    for (const row of rows) {
      const list = map.get(row.entryDate) ?? [];
      list.push(row);
      map.set(row.entryDate, list);
    }
    return map;
  }, [rows]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month0, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cursor.year, cursor.month0 + 1, 0).getDate();
    const out: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startPad; i += 1) out.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = `${cursor.year}-${String(cursor.month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ date, day: d });
    }
    return out;
  }, [cursor]);

  const selectedRows = selectedDate ? byDate.get(selectedDate) ?? [] : [];
  const monthLabel = `${cursor.year}년 ${cursor.month0 + 1}월`;

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month0 + delta, 1);
      return { year: d.getFullYear(), month0: d.getMonth() };
    });
  }

  if (!ready) return <LoadingBlock message="캘린더를 불러오는 중…" />;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/diary" />
        <BrandMark />
        <Link className="btn-chip btn" href="/diary">
          작성
        </Link>
      </div>

      <section className="stack">
        <h1 className="hero-title">감정 캘린더</h1>
        <p className="muted">내 기록과 상대의 감정·트리거를 함께 볼 수 있어요.</p>
      </section>

      <section className="card stack">
        <div className="diary-cal-head">
          <button type="button" className="btn btn-ghost" onClick={() => shiftMonth(-1)}>
            이전
          </button>
          <strong>{monthLabel}</strong>
          <button type="button" className="btn btn-ghost" onClick={() => shiftMonth(1)}>
            다음
          </button>
        </div>
        <div className="diary-cal-weekdays">
          {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="diary-cal-grid">
          {cells.map((cell, idx) => {
            if (!cell.date || cell.day == null) {
              return <div key={`pad-${idx}`} className="diary-cal-cell diary-cal-empty" />;
            }
            const entries = byDate.get(cell.date) ?? [];
            const mine = entries.find((e) => e.isMine);
            const partner = entries.find((e) => !e.isMine);
            const selected = selectedDate === cell.date;
            return (
              <button
                key={cell.date}
                type="button"
                className={selected ? 'diary-cal-cell diary-cal-selected' : 'diary-cal-cell'}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span className="diary-cal-day">{cell.day}</span>
                <span className="diary-cal-dots">
                  {mine ? (
                    <span
                      className="diary-cal-dot"
                      style={{ background: emotionMeta(mine.emotionCode).color }}
                      title="나"
                    />
                  ) : null}
                  {partner ? (
                    <span
                      className="diary-cal-dot diary-cal-dot-partner"
                      style={{ background: emotionMeta(partner.emotionCode).color }}
                      title="상대"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2 className="diary-section-title">{selectedDate ?? '날짜 선택'}</h2>
        {!selectedRows.length ? (
          <p className="muted">이 날의 기록이 없어요.</p>
        ) : (
          selectedRows.map((row) => (
            <div className="card stack" key={row.id}>
              <div className="meta">
                <span>{row.isMine ? '내 기록' : '상대의 기록'}</span>
                <span
                  className="diary-emotion-pill"
                  style={{ background: emotionMeta(row.emotionCode).color }}
                >
                  {emotionMeta(row.emotionCode).label}
                </span>
              </div>
              <p className="muted">
                {row.triggerCodes.map(triggerLabel).join(' · ') || '트리거 없음'}
              </p>
              {row.isMine && row.comment ? (
                <p style={{ whiteSpace: 'pre-wrap' }}>{row.comment}</p>
              ) : null}
              {!row.isMine ? (
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  상대의 메모는 보이지 않아요.
                </p>
              ) : null}
              {row.isMine && row.entryDate === today ? (
                <Link className="btn btn-secondary" href="/diary">
                  오늘 일기 수정
                </Link>
              ) : null}
            </div>
          ))
        )}
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
