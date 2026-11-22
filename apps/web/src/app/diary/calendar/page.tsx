'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, BrandMark } from '@/components/ui';
import { LoadingBlock } from '@/components/StateBlock';
import { EmotionImagePreview } from '@/components/diary/EmotionImagePreview';
import { TriggerIcon } from '@/components/diary/TriggerIcon';
import { api, getToken } from '@/lib/api';
import {
  emotionMeta,
  kstToday,
  monthRange,
  triggerLabel,
  type EmotionDiary,
} from '@/lib/diary';
import type { CoupleRoom } from '@/lib/types';

function formatDayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const wd = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${week[wd]})`;
}

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
  const recordedDays = byDate.size;

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month0 + delta, 1);
      return { year: d.getFullYear(), month0: d.getMonth() };
    });
  }

  if (!ready) return <LoadingBlock message="캘린더를 불러오는 중…" />;

  return (
    <main className="shell diary-cal-page">
      <div className="topbar">
        <BackButton href="/diary" />
        <BrandMark />
        <Link className="btn-chip btn" href="/diary">
          작성
        </Link>
      </div>

      <header className="diary-cal-monthbar">
        <button
          type="button"
          className="diary-cal-nav"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="diary-cal-monthbar__center">
          <h1 className="diary-cal-month-title">{monthLabel}</h1>
          <p className="muted diary-cal-month-sub">기록 {recordedDays}일</p>
        </div>
        <button
          type="button"
          className="diary-cal-nav"
          onClick={() => shiftMonth(1)}
          aria-label="다음 달"
        >
          ›
        </button>
      </header>

      <section className="diary-cal-board">
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
            const isToday = cell.date === today;
            const previewSize = mine && partner ? 20 : 28;
            return (
              <button
                key={cell.date}
                type="button"
                className={[
                  'diary-cal-cell',
                  selected ? 'diary-cal-selected' : '',
                  isToday ? 'diary-cal-today' : '',
                  mine || partner ? 'has-entry' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span className="diary-cal-day">{cell.day}</span>
                <span className="diary-cal-previews">
                  {mine ? (
                    <EmotionImagePreview
                      emotionCode={mine.emotionCode}
                      triggerCodes={mine.triggerCodes}
                      seedKey={`${mine.id}-${mine.entryDate}`}
                      size={previewSize}
                    />
                  ) : null}
                  {partner ? (
                    <EmotionImagePreview
                      emotionCode={partner.emotionCode}
                      triggerCodes={partner.triggerCodes}
                      seedKey={`${partner.id}-${partner.entryDate}`}
                      size={previewSize}
                    />
                  ) : null}
                  {!mine && !partner ? <span className="diary-cal-empty-dot" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="diary-day-stage diary-enter" key={selectedDate ?? 'none'}>
        <div className="diary-day-stage__head">
          <h2 className="diary-day-stage__title">
            {selectedDate ? formatDayLabel(selectedDate) : '날짜 선택'}
          </h2>
          {selectedDate === today ? (
            <Link className="diary-day-stage__write" href="/diary">
              오늘 쓰기
            </Link>
          ) : null}
        </div>

        {!selectedRows.length ? (
          <div className="diary-day-empty">
            <span className="diary-day-empty__orb" aria-hidden />
            <p className="muted" style={{ margin: 0 }}>
              이 날의 기록이 없어요.
            </p>
            {selectedDate === today ? (
              <Link className="btn btn-primary" href="/diary">
                감정 기록하기
              </Link>
            ) : null}
          </div>
        ) : (
          <div
            className={
              selectedRows.length > 1 ? 'diary-day-pair' : 'diary-day-single'
            }
          >
            {selectedRows.map((row) => {
              const meta = emotionMeta(row.emotionCode);
              return (
                <article className="diary-day-entry" key={row.id}>
                  <EmotionImagePreview
                    emotionCode={row.emotionCode}
                    triggerCodes={row.triggerCodes}
                    seedKey={`${row.id}-${row.entryDate}`}
                    size={selectedRows.length > 1 ? 96 : 120}
                  />
                  <div className="diary-day-entry__meta">
                    <span className="diary-day-entry__who">
                      {row.isMine ? '나' : '상대'}
                    </span>
                    <strong
                      className="diary-day-entry__emotion"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </strong>
                  </div>
                  {row.triggerCodes.length ? (
                    <div className="diary-day-triggers">
                      {row.triggerCodes.map((code) => (
                        <span className="diary-day-trigger" key={code}>
                          <TriggerIcon code={code} size={14} />
                          {triggerLabel(code)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {row.isMine && row.comment ? (
                    <p className="diary-day-comment">{row.comment}</p>
                  ) : null}
                  {!row.isMine ? (
                    <p className="diary-day-private">상대의 메모는 보이지 않아요</p>
                  ) : null}
                  {row.isMine && row.entryDate === today ? (
                    <Link className="btn btn-secondary" href="/diary">
                      수정
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
