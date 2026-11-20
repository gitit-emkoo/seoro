'use client';

import { useEffect, useRef } from 'react';

/** 대기 화면용 가벼운 폴링. 탭이 보일 때만 돌립니다. */
export function usePolling(
  enabled: boolean,
  tick: () => unknown,
  intervalMs = 3000,
) {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | null = null;

    const run = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      void Promise.resolve(tickRef.current()).catch(() => {
        /* 폴링 실패는 다음 주기에 재시도 */
      });
    };

    timer = window.setInterval(run, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs]);
}
