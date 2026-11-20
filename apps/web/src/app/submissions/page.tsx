'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBMISSION_STATUS_LABEL, type SubmissionStatus } from '@seoro/shared';
import { BackButton, BrandMark } from '@/components/ui';
import { api, getToken } from '@/lib/api';

type Submission = {
  id: string;
  verificationItemId: string;
  status: SubmissionStatus;
  originalFileName: string | null;
  verificationItem: {
    title: string;
    description: string;
    requiredDocumentType: string | null;
  };
  verification: {
    revisionRequest: string | null;
    resultSummary: string | null;
    unverifiableReason: string | null;
    officialCheckStatus: string;
  } | null;
};

function isComplete(status: SubmissionStatus) {
  return status !== 'NOT_SUBMITTED' && status !== 'NEEDS_REVISION';
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const list = await api<Submission[]>('/api/submissions/me');
    setRows(list);
  }

  const allSubmitted = useMemo(
    () => rows.length > 0 && rows.every((r) => isComplete(r.status)),
    [rows],
  );
  const pendingTitles = useMemo(
    () => rows.filter((r) => !isComplete(r.status)).map((r) => r.verificationItem.title),
    [rows],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void load().catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'));
  }, [router]);

  async function onUpload(verificationItemId: string, file: File) {
    setBusyId(verificationItemId);
    setError('');
    try {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      form.append('verificationItemId', verificationItemId);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/submissions/upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || '업로드 실패');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setBusyId('');
    }
  }

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BackButton href="/home" />
        <BrandMark />
        <span style={{ width: 42 }} />
      </div>

      <section className="stack">
        <h1 className="hero-title">자료를 준비해 주세요</h1>
        <p className="muted">상대방은 아직 볼 수 없습니다.</p>
      </section>

      <section className="stack">
        {rows.map((row) => (
          <div className="card stack" key={row.id}>
            <strong>{row.verificationItem.title}</strong>
            <p className="muted">
              필요 서류: {row.verificationItem.requiredDocumentType || '안내된 증빙'}
            </p>
            <div className="meta">
              <span>상태</span>
              <span>{SUBMISSION_STATUS_LABEL[row.status]}</span>
            </div>
            {row.verification?.revisionRequest ? (
              <p className="error">보완 요청: {row.verification.revisionRequest}</p>
            ) : null}
            {row.originalFileName ? (
              <p className="muted">파일: {row.originalFileName}</p>
            ) : null}
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {busyId === row.verificationItemId
                ? '업로드 중…'
                : row.originalFileName
                  ? '교체'
                  : '파일 업로드'}
              <input
                type="file"
                accept="application/pdf,image/*"
                hidden
                disabled={!!busyId}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(row.verificationItemId, file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        ))}
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack">
        {allSubmitted ? (
          <>
            <p className="muted">합의 항목 제출이 모두 완료되었습니다.</p>
            <Link className="btn btn-primary" href="/reports">
              미리보기
            </Link>
          </>
        ) : (
          <>
            <p className="muted">
              {pendingTitles.length
                ? `남은 항목: ${pendingTitles.join(', ')}`
                : '남은 제출 항목이 있어요'}
            </p>
            <button className="btn btn-primary" type="button" disabled>
              미리보기
            </button>
          </>
        )}
        <Link className="btn btn-secondary" href="/home">
          나중에 이어서
        </Link>
      </section>
    </main>
  );
}
