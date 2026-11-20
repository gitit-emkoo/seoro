'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchJourneyStatus } from '@/lib/progress';
import { getToken } from '@/lib/api';

const TABS = [
  { href: '/app', label: '홈', match: (p: string) => p === '/app' },
  {
    href: '/promises',
    label: '약속',
    match: (p: string) => p.startsWith('/promises'),
  },
  { href: '/home', label: '확인', match: (p: string) => p === '/home' || p.startsWith('/reports') },
  { href: '/my', label: '마이', match: (p: string) => p === '/my' || p.startsWith('/my/') },
] as const;

/** 서로확인 완료(mutualReady) 이후에만 노출 */
export function BottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setVisible(false);
      return;
    }
    void fetchJourneyStatus().then((status) => {
      setVisible(Boolean(status?.mutualReady));
    });
  }, [pathname]);

  if (!visible) return null;

  return (
    <>
      <div className="bottom-nav-spacer" aria-hidden />
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={active ? 'bottom-nav__item is-active' : 'bottom-nav__item'}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
