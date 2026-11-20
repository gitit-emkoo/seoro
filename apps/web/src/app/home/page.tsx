'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { AvatarPair, BrandMark } from '@/components/ui';
import { BottomNav } from '@/components/BottomNav';
import { ProgressSteps } from '@/components/ProgressSteps';
import { ErrorBlock, LoadingBlock } from '@/components/StateBlock';
import { api, getToken, setToken } from '@/lib/api';
import {
  buildInviteUrl,
  copyText,
  getInviteToken,
  saveInviteSession,
} from '@/lib/invite';
import {
  fetchJourneyStatus,
  hasSeenMutualResult,
  promisePromptStorageKey,
  type JourneyStatus,
} from '@/lib/progress';
import type { AuthUser, CoupleRoom, CreateRoomResponse } from '@/lib/types';

/**
 * 서로확인 메인(허브).
 * 연결~결과 진행의 허브이며, 앱 전체 홈(/app)과는 구분됩니다.
 */
export default function VerifyHubPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [journey, setJourney] = useState<JourneyStatus | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPromisePrompt, setShowPromisePrompt] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    void (async () => {
      try {
        const me = await api<AuthUser>('/api/auth/me');
        if (!me.onboardingCompleted) {
          router.replace('/onboarding');
          return;
        }
        setUser(me);
        const myRoom = await api<CoupleRoom | null>('/api/couples/me');
        setRoom(myRoom);
        const saved = getInviteToken();
        if (saved) setInviteToken(saved);

        const status = await fetchJourneyStatus();
        setJourney(status);

        // 상호 결과를 한 번이라도 본 뒤에만 약속 유도 팝업
        if (
          status?.mutualReady &&
          status.coupleRoomId &&
          hasSeenMutualResult(status.coupleRoomId)
        ) {
          const key = promisePromptStorageKey(status.coupleRoomId);
          const hidePrompt = localStorage.getItem(key) === '1';
          if (!hidePrompt) {
            try {
              const promises = await api<Array<{ status: string }>>('/api/promises');
              const hasCompletedPromise = promises.some((p) => p.status === 'COMPLETED');
              if (!hasCompletedPromise) {
                setShowPromisePrompt(true);
              }
            } catch {
              setShowPromisePrompt(true);
            }
          }
        }
      } catch {
        setToken(null);
        router.replace('/login');
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!inviteToken) {
      setQrDataUrl('');
      return;
    }
    void QRCode.toDataURL(buildInviteUrl(inviteToken), {
      margin: 1,
      width: 240,
    }).then(setQrDataUrl);
  }, [inviteToken]);

  const partner = useMemo(() => {
    if (!room || !user) return null;
    return room.members.find((m) => m.userId !== user.id) ?? null;
  }, [room, user]);

  const meLabel = user?.name || user?.email || '나';
  const partnerLabel = partner?.name || partner?.email || '상대';
  const verifyStep =
    room?.status === 'ACTIVE'
      ? (journey?.verifyStep ?? 'scope')
      : 'connect';
  const verifyComplete = Boolean(journey?.verifyComplete);

  async function createRoom() {
    setBusy(true);
    setError('');
    try {
      const res = await api<CreateRoomResponse>('/api/couples', { method: 'POST' });
      setInviteToken(res.invite.token);
      saveInviteSession(res.invite.token, res.invite.invitationCode);
      const myRoom = await api<CoupleRoom | null>('/api/couples/me');
      setRoom(myRoom);
      setJourney(await fetchJourneyStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : '공간 생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateInvite() {
    setBusy(true);
    setError('');
    try {
      const invite = await api<{
        invitationCode: string;
        token: string;
        expiresAt: string;
      }>('/api/couples/invites/regenerate', { method: 'POST' });
      setInviteToken(invite.token);
      saveInviteSession(invite.token, invite.invitationCode);
      const myRoom = await api<CoupleRoom | null>('/api/couples/me');
      setRoom(myRoom);
      setToast('새 초대가 발급되었습니다. 이전 번호/링크는 사용할 수 없습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 재발급에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    const code = room?.pendingInvite?.invitationCode;
    if (!code) return;
    await copyText(code);
    setToast('초대번호를 복사했습니다.');
  }

  async function copyLink() {
    if (!inviteToken) {
      setToast('링크용 토큰이 없습니다. 초대를 다시 생성해 주세요.');
      return;
    }
    await copyText(buildInviteUrl(inviteToken));
    setToast('초대 링크를 복사했습니다.');
  }

  async function shareInvite() {
    const code = room?.pendingInvite?.invitationCode;
    const url = inviteToken ? buildInviteUrl(inviteToken) : undefined;
    const text = `서로에서 함께 확인해 볼까요? 초대번호 ${code ?? ''}`;
    if (navigator.share) {
      await navigator.share({ title: '서로 초대', text, url });
      return;
    }
    await copyText(url || text);
    setToast('공유 대신 링크/문구를 복사했습니다.');
  }

  function logout() {
    setToken(null);
    router.replace('/login');
  }

  function closePromisePrompt(hideForever: boolean) {
    if (hideForever && journey?.coupleRoomId) {
      localStorage.setItem(promisePromptStorageKey(journey.coupleRoomId), '1');
    }
    setShowPromisePrompt(false);
  }

  function goToAppHome() {
    if (dontShowAgain && journey?.coupleRoomId) {
      localStorage.setItem(promisePromptStorageKey(journey.coupleRoomId), '1');
    }
    setShowPromisePrompt(false);
    router.push('/app');
  }

  const activeTitle = (() => {
    if (verifyComplete) return '서로 확인이 완료되었어요';
    switch (journey?.reason) {
      case 'NEED_SCOPE_SELECTION':
        return '확인 항목을 선택해 주세요';
      case 'NEED_SCOPE_AGREEMENT':
        return '항목을 합의해 주세요';
      case 'NEED_PAYMENT':
        return '결제를 진행해 주세요';
      case 'NEED_SUBMISSION':
        return '자료를 업로드해 주세요';
      case 'NEED_DISCLOSURE':
        return '결과를 확인해 보세요';
      case 'WAITING_PARTNER_DISCLOSURE':
        return '상대 공개를 기다려 주세요';
      default:
        return '함께 확인해 볼까요';
    }
  })();

  if (loading) return <LoadingBlock />;

  return (
    <main className="shell stack-lg">
      <div className="topbar">
        <BrandMark />
        <button className="icon-btn" onClick={logout} aria-label="로그아웃" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ProgressSteps current={verifyStep} completed={verifyComplete} />

      {!room ? (
        <>
          <section className="stack">
            <h1 className="hero-title">커플 공간을 만들어 주세요</h1>
            <p className="hub-status">
              커플 공간을 만들거나 초대받았어요로 가 주세요
            </p>
          </section>

          <section className="card card-soft stack">
            <button className="btn btn-primary" onClick={createRoom} disabled={busy}>
              커플공간 생성
            </button>
            <Link className="btn btn-secondary" href="/invite">
              초대받았어요
            </Link>
          </section>
        </>
      ) : null}

      {room?.status === 'WAITING_PARTNER' ? (
        <>
          <section className="stack">
            <h1 className="hero-title">상대방을 초대해 주세요</h1>
            <p className="hub-status">
              번호·링크·QR 중 편한 방법으로 전달해 주세요.
            </p>
            <AvatarPair
              left={{
                label: meLabel,
                userId: user?.id,
                hasAvatar: Boolean(user?.hasAvatar),
              }}
              right="?"
              meUserId={user?.id}
              onMineUpdated={() => {
                void api<AuthUser>('/api/auth/me').then(setUser);
              }}
            />
          </section>

          <section className="card stack">
            <div className="invite-code">{room.pendingInvite?.invitationCode}</div>
            <div className="meta">
              <span>만료</span>
              <span>
                {room.pendingInvite
                  ? new Date(room.pendingInvite.expiresAt).toLocaleString('ko-KR')
                  : '-'}
              </span>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => void copyCode()}>
              초대번호 복사
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => void copyLink()}>
              초대 링크 복사
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => void shareInvite()}>
              공유하기
            </button>
            {qrDataUrl ? (
              <div className="qr-box">
                <img src={qrDataUrl} alt="초대 QR 코드" />
                <p className="muted">QR을 스캔하면 참여 화면으로 이동합니다.</p>
              </div>
            ) : (
              <p className="muted">
                QR/링크는 초대 생성 직후에만 표시됩니다. 필요하면 초대를 다시
                만들어 주세요.
              </p>
            )}
            <button
              className="btn btn-ghost"
              onClick={regenerateInvite}
              disabled={busy}
              type="button"
            >
              초대 다시 생성
            </button>
          </section>
        </>
      ) : null}

      {room?.status === 'ACTIVE' ? (
        <>
          <section className="stack">
            <h1 className="hero-title">{activeTitle}</h1>
            <p className="hub-status">
              {verifyComplete
                ? '결과를 다시 보거나, 우리의 약속으로 이어갈 수 있어요.'
                : `${partnerLabel}님과 연결되었습니다.`}
            </p>
            <AvatarPair
              left={{
                label: meLabel,
                userId: user?.id,
                hasAvatar: Boolean(user?.hasAvatar),
              }}
              right={{
                label: partnerLabel,
                userId: partner?.userId,
                hasAvatar: Boolean(partner?.hasAvatar),
              }}
              meUserId={user?.id}
              onMineUpdated={() => {
                void api<AuthUser>('/api/auth/me').then(setUser);
                void api<CoupleRoom | null>('/api/couples/me').then(setRoom);
              }}
            />
          </section>

          <section className="card card-soft stack">
            {journey?.cta ? (
              journey.ctaDisabled ? (
                <>
                  <button className="btn btn-primary" type="button" disabled>
                    {journey.cta.label}
                  </button>
                  {journey.statusMessage ? (
                    <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
                      {journey.statusMessage}
                    </p>
                  ) : null}
                </>
              ) : (
                <Link className="btn btn-primary" href={journey.cta.href}>
                  {verifyComplete ? '결과 보기' : journey.cta.label}
                </Link>
              )
            ) : (
              <Link className="btn btn-primary" href="/scope">
                확인 항목 선택하기
              </Link>
            )}
            {verifyComplete || journey?.promiseUnlocked ? (
              <Link className="btn btn-secondary" href="/app">
                우리의 약속 열기
              </Link>
            ) : null}
          </section>
        </>
      ) : null}

      {toast ? <p className="muted">{toast}</p> : null}
      {error ? <ErrorBlock message={error} /> : null}

      {showPromisePrompt ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card stack" role="dialog" aria-modal="true">
            <strong>서로에 대한 확인이 끝났어요</strong>
            <p className="muted">
              우리의 약속 기능이 열렸어요. 이 공간은 <strong>무료 구독 중</strong>이라
              평생 무료로 사용할 수 있어요.
            </p>
            <p className="muted">이제 첫 약속을 만들어 보세요.</p>
            <label className="check-row">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span>다시 보지 않기</span>
            </label>
            <button className="btn btn-primary" type="button" onClick={goToAppHome}>
              확인
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => closePromisePrompt(dontShowAgain)}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
      <BottomNav />
    </main>
  );
}
