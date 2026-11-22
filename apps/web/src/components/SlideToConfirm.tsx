'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 드래그로 확정하는 CTA. 키보드 Enter/Space 및 클릭 fallback 지원.
 */
export function SlideToConfirm({
  label,
  doneLabel,
  onConfirm,
  disabled = false,
  busy = false,
}: {
  label: string;
  doneLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const offsetRef = useRef(0);
  const maxRef = useRef(0);
  const [offset, setOffset] = useState(0);
  const [max, setMax] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const thumb = 48;
    const pad = 4;
    const nextMax = Math.max(0, track.clientWidth - thumb - pad * 2);
    maxRef.current = nextMax;
    setMax(nextMax);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (disabled || busy) {
      offsetRef.current = 0;
      setOffset(0);
      setConfirmed(false);
    }
  }, [disabled, busy]);

  function setOffsetBoth(value: number) {
    offsetRef.current = value;
    setOffset(value);
  }

  async function finish() {
    if (confirmed || disabled || busy) return;
    setConfirmed(true);
    setOffsetBoth(maxRef.current);
    try {
      await onConfirm();
    } catch {
      setConfirmed(false);
      setOffsetBoth(0);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || busy || confirmed) return;
    dragging.current = true;
    startX.current = e.clientX;
    startOffset.current = offsetRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current || disabled || busy || confirmed) return;
    const next = Math.min(
      maxRef.current,
      Math.max(0, startOffset.current + (e.clientX - startX.current)),
    );
    setOffsetBoth(next);
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (offsetRef.current >= maxRef.current * 0.88) {
      void finish();
    } else {
      setOffsetBoth(0);
    }
  }

  const fillRatio = max > 0 ? offset / max : 0;
  const showDone = confirmed || busy;

  return (
    <div
      ref={trackRef}
      className={`slide-confirm${disabled ? ' is-disabled' : ''}${showDone ? ' is-done' : ''}`}
      role="group"
      aria-label={label}
    >
      <div className="slide-confirm__fill" style={{ width: `${fillRatio * 100}%` }} />
      <span className="slide-confirm__label">
        {showDone ? doneLabel || '처리 중…' : label}
      </span>
      <button
        type="button"
        className="slide-confirm__thumb"
        style={{ transform: `translateX(${offset}px)` }}
        disabled={disabled || busy || confirmed}
        aria-label={`${label} — 끝까지 밀어 확정`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void finish();
          }
        }}
        onDoubleClick={() => void finish()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M8 5l8 7-8 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className="slide-confirm__fallback"
        disabled={disabled || busy || confirmed}
        onClick={() => void finish()}
      >
        {showDone ? doneLabel || '처리 중…' : label}
      </button>
    </div>
  );
}
