'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import { OnboardingVisual } from '@/components/OnboardingVisual';
import { LoadingBlock } from '@/components/StateBlock';
import { getToken } from '@/lib/api';
import { goToNextStep } from '@/lib/progress';
import { saveOnboarding } from '@/lib/onboarding';

type Card = {
  id: string;
  title: string;
  body: string;
  question: string | null;
  statisticText: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  surveyYear: string | null;
};

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function OnboardingCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragX, setDragX] = useState(0);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      if (getToken()) {
        const path = await goToNextStep('/home');
        if (path !== '/onboarding') {
          router.replace(path);
          return;
        }
      }
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/onboarding/cards`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || '카드를 불러오지 못했습니다.');
        setCards(Array.isArray(data) ? data.slice(0, 4) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const go = useCallback(
    (next: number) => {
      if (!cards.length) return;
      setIndex(Math.max(0, Math.min(cards.length - 1, next)));
      setDragX(0);
    },
    [cards.length],
  );

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const x = e.touches[0]?.clientX ?? touchX.current;
    setDragX(x - touchX.current);
  }

  function onTouchEnd() {
    if (touchX.current == null) return;
    if (dragX <= -56) go(index + 1);
    else if (dragX >= 56) go(index - 1);
    else setDragX(0);
    touchX.current = null;
  }

  if (loading) return <LoadingBlock message="필요성 안내를 준비하는 중…" />;

  if (!cards.length) {
    return (
      <main className="shell stack">
        <p className="error">{error || '표시할 콘텐츠가 없습니다.'}</p>
        <Link className="btn btn-primary" href="/onboarding/survey">
          설문으로 이동
        </Link>
      </main>
    );
  }

  const card = cards[index];
  const isLast = index >= cards.length - 1;
  const visualVariant = Math.min(index, 3) as 0 | 1 | 2 | 3;
  const titleLines = splitParagraphs(card.title);
  const bodyLines = splitParagraphs(card.body);

  return (
    <main className="shell stack-lg ob-page">
      <div className="topbar">
        <BrandMark />
      </div>

      <div className="ob-progress" aria-label={`진행 ${index + 1} / ${cards.length}`}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={i === index ? 'ob-dot ob-dot-on' : 'ob-dot'}
            aria-label={`${i + 1}번째 카드`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => go(i)}
          />
        ))}
        <span className="ob-progress-label">
          {index + 1}/{cards.length}
        </span>
      </div>

      <section
        className="ob-card"
        style={{ transform: `translateX(${dragX * 0.35}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <OnboardingVisual variant={visualVariant} />

        {card.question ? <p className="ob-eyebrow">{card.question}</p> : null}

        <h1 className="ob-title">
          {titleLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </h1>

        <div className="ob-body">
          {bodyLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {card.statisticText ? (
          <div className="ob-stat-chip">
            <strong>{card.statisticText}</strong>
          </div>
        ) : null}

        {card.sourceName ? (
          <p className="ob-source">
            출처: {card.sourceName}
            {card.surveyYear ? ` · ${card.surveyYear}` : ''}
            {card.sourceUrl ? (
              <>
                {' '}
                ·{' '}
                <a href={card.sourceUrl} target="_blank" rel="noreferrer">
                  바로가기
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {isLast ? (
          <div className="ob-brand-close">
            <strong>SEORO</strong>
            <span>서로를 알고, 함께 나아가다.</span>
          </div>
        ) : null}
      </section>

      <div className="stack">
        {!isLast ? (
          <>
            <button className="btn btn-primary" type="button" onClick={() => go(index + 1)}>
              다음
            </button>
            {index > 0 ? (
              <button className="btn btn-ghost" type="button" onClick={() => go(index - 1)}>
                이전
              </button>
            ) : null}
          </>
        ) : (
          <section className="ob-cta stack">
            <div>
              <strong className="ob-cta-title">우리의 이야기를 시작해 볼까요?</strong>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                saveOnboarding({ cardsDone: true });
                router.push('/onboarding/survey');
              }}
            >
              시작하기
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => go(index - 1)}>
              이전
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
