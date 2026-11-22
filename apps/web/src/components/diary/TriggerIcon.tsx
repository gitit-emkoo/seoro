import type { TriggerCode } from '@/lib/diary';

/** SEORO 자체 미니멀 라인 아이콘 (리커넥트 원본 SVG 미사용) */
export function TriggerIcon({
  code,
  size = 24,
  color = 'rgba(34,34,34,0.72)',
}: {
  code: string;
  size?: number;
  color?: string;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (code as TriggerCode) {
    case 'ACTIVITY':
      return (
        <svg {...props}>
          <path d="M8 5v14l11-7z" />
        </svg>
      );
    case 'FAMILY':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="2.2" />
          <circle cx="15" cy="8" r="2.2" />
          <path d="M5.5 18c.6-2.4 2.3-3.8 3.5-3.8S12 15.6 12 18" />
          <path d="M12 18c.6-2.4 2.3-3.8 3.5-3.8S18.4 15.6 18.5 18" />
        </svg>
      );
    case 'FRIEND':
      return (
        <svg {...props}>
          <circle cx="8.5" cy="9" r="2.3" />
          <circle cx="15.5" cy="9" r="2.3" />
          <path d="M4.5 18c.7-2.6 2.5-4 4-4s3.3 1.4 4 4" />
          <path d="M11.5 18c.7-2.6 2.5-4 4-4s3.3 1.4 4 4" />
        </svg>
      );
    case 'HEALTH':
      return (
        <svg {...props}>
          <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" />
        </svg>
      );
    case 'PARTNER':
      return (
        <svg {...props}>
          <path d="M12 20s-6.5-4.2-6.5-9.2A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 6.5 2.8c0 5-6.5 9.2-6.5 9.2z" />
          <path d="M12 8V4.5" />
        </svg>
      );
    case 'SOCIETY':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.6 2.4 14.4 0 17M12 3.5c-2.4 2.6-2.4 14.4 0 17" />
        </svg>
      );
    case 'PARTICIPATION':
      return (
        <svg {...props}>
          <path d="M8 12h8M12 8v8" />
          <circle cx="12" cy="12" r="8.5" />
        </svg>
      );
    case 'RELATIONSHIP':
      return (
        <svg {...props}>
          <path d="M8 14a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
          <path d="M16 14a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" />
          <path d="M8 17.5c1.4 1.4 6.6 1.4 8 0" />
        </svg>
      );
    case 'IDENTITY':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 19c1.2-3.2 3.2-4.8 6-4.8S16.8 15.8 18 19" />
        </svg>
      );
    case 'WORK':
      return (
        <svg {...props}>
          <rect x="3.5" y="8" width="17" height="11" rx="2" />
          <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
        </svg>
      );
    case 'TRAVEL':
      return (
        <svg {...props}>
          <path d="M3 17l7-2 4-8 2 2-3 7 6 2-1 2-15-3z" />
        </svg>
      );
    case 'SHOW':
      return (
        <svg {...props}>
          <path d="M4 9l8-4 8 4v8l-8 4-8-4V9z" />
          <path d="M12 5v16" />
        </svg>
      );
    case 'EXERCISE':
      return (
        <svg {...props}>
          <path d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10" />
        </svg>
      );
    case 'STYLE':
      return (
        <svg {...props}>
          <path d="M6 9l6-4 6 4v2l-2 9H8L6 11V9z" />
          <path d="M10 20l2-8 2 8" />
        </svg>
      );
    case 'EXAM':
      return (
        <svg {...props}>
          <path d="M7 4h7l3 3v13H7V4z" />
          <path d="M14 4v3h3M9 11h6M9 15h4" />
        </svg>
      );
    case 'FOOD':
      return (
        <svg {...props}>
          <path d="M8 4v7a2 2 0 0 0 2 2v7" />
          <path d="M6 4v5M10 4v5M16 4v16M16 4c2.2 0 3 2.2 3 4.5S18.2 13 16 13" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}
