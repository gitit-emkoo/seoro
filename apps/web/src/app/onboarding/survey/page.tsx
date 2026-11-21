'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/ui';
import {
  buildSurveyPayload,
  loadOnboarding,
  saveOnboarding,
  SURVEY_QUESTIONS,
  type SurveyAnswers,
} from '@/lib/onboarding';

type Step = 0 | 'done';

export default function OnboardingSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({
    q1: [],
    q2: [],
    q3: null,
    q4: null,
  });

  useEffect(() => {
    const local = loadOnboarding();
    if (!local.cardsDone) {
      router.replace('/onboarding');
      return;
    }
    if (local.answers) setAnswers(local.answers);
  }, [router]);

  const question = step === 'done' ? null : SURVEY_QUESTIONS[0];

  const canContinue = useMemo(() => {
    if (step === 'done') return true;
    return Boolean(answers.q3);
  }, [answers.q3, step]);

  function selectAnswer(code: string) {
    setAnswers((prev) => ({ ...prev, q3: code }));
  }

  function persist(nextAnswers: SurveyAnswers) {
    const payload = buildSurveyPayload(nextAnswers);
    saveOnboarding({
      cardsDone: true,
      answers: nextAnswers,
      selectedCodes: payload.selectedCodes,
      surveyNote: payload.surveyNote,
    });
  }

  function goNext() {
    persist(answers);
    setStep('done');
  }

  function goPrev() {
    if (step === 'done') {
      setStep(0);
      return;
    }
    router.push('/onboarding');
  }

  function continueAuth(mode: 'register' | 'login') {
    persist(answers);
    const next = encodeURIComponent('/home');
    router.push(`/${mode}?next=${next}&from=onboarding`);
  }

  if (step === 'done') {
    return (
      <main className="shell stack-lg ob-page">
        <div className="topbar">
          <BrandMark />
          <span style={{ width: 42 }} />
        </div>

        <section className="ob-survey-done stack">
          <p className="ob-eyebrow">준비 완료</p>
          <h1 className="ob-title">
            서로를 알아가는 일,
            <br />
            이제 조금 더 자연스럽게 시작해 보세요.
          </h1>
          <div className="ob-body">
            <p>중요한 것은 한 사람이 다른 사람을 확인하는 것이 아닙니다.</p>
            <p>두 사람이 같은 마음으로, 서로에 대해 알아가는 것입니다.</p>
            <p>SEORO에서 두 사람만의 공간을 만들어 보세요.</p>
          </div>
        </section>

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => continueAuth('register')}
        >
          SEORO 시작하기
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => continueAuth('login')}
        >
          이미 계정이 있어요
        </button>
        <button className="btn btn-ghost" type="button" onClick={goPrev}>
          이전 질문으로
        </button>
      </main>
    );
  }

  if (!question) return null;

  return (
    <main className="shell stack-lg ob-page">
      <div className="topbar">
        <BrandMark />
        <Link className="btn-chip btn" href="/onboarding">
          카드로
        </Link>
      </div>

      <div className="ob-progress" aria-label="질문 1 / 1">
        <span className="ob-dot ob-dot-on" aria-hidden />
        <span className="ob-progress-label">1/1</span>
      </div>

      <section className="stack ob-survey-q">
        <h1 className="ob-title ob-survey-title">{question.title}</h1>
        <p className="muted">{question.hint}</p>
      </section>

      <section className="stack">
        {question.options.map((opt) => {
          const on = answers.q3 === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              className={on ? 'ob-choice ob-choice-on' : 'ob-choice'}
              onClick={() => selectAnswer(opt.code)}
            >
              <span className="ob-choice-mark" aria-hidden>
                {on ? '✓' : ''}
              </span>
              <span className="ob-choice-label">{opt.label}</span>
            </button>
          );
        })}
      </section>

      <button
        className="btn btn-primary"
        type="button"
        disabled={!canContinue}
        onClick={goNext}
      >
        다음
      </button>
      <button className="btn btn-ghost" type="button" onClick={goPrev}>
        이전
      </button>
    </main>
  );
}
