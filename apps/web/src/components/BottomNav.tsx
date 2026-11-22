'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchJourneyStatus } from '@/lib/progress';
import { getToken } from '@/lib/api';

const TABS = [
  {
    href: '/app',
    label: '홈',
    match: (p: string) => p === '/app',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/promises',
    label: '약속',
    match: (p: string) => p.startsWith('/promises'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/home',
    label: '확인',
    match: (p: string) => p === '/home' || p.startsWith('/reports'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3z" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/my',
    label: '마이',
    match: (p: string) => p === '/my' || p.startsWith('/my/'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
      </svg>
    ),
  },
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
              {tab.icon}
              <span className="bottom-nav__label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
