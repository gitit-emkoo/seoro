import type { Metadata } from 'next';
import { Manrope, Noto_Sans_KR } from 'next/font/google';
import { APP_NAME } from '@seoro/shared';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-latin',
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: '결혼 전에는 서로를 확인하고, 함께할 약속은 기록으로 남깁니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
