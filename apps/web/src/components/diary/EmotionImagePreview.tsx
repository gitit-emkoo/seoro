'use client';

import { emotionMeta } from '@/lib/diary';
import { TriggerIcon } from '@/components/diary/TriggerIcon';

type LayoutItem =
  | {
      kind: 'emotion';
      x: number;
      y: number;
      size: number;
      color: string;
    }
  | {
      kind: 'trigger';
      code: string;
      x: number;
      y: number;
      size: number;
      rotation: number;
    };

/** 날짜 기반 시드 — 같은 날이면 같은 배치 (DB에 randomInfo 없이 재현) */
function seededRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildEmotionLayout(
  emotionCode: string,
  triggerCodes: string[],
  seedKey: string,
): LayoutItem[] {
  const rand = seededRand(seedKey);
  const emotion = emotionMeta(emotionCode);
  const items: LayoutItem[] = [
    {
      kind: 'emotion',
      x: 0.5,
      y: 0.5,
      size: 0.46,
      color: emotion.color,
    },
  ];

  for (const code of triggerCodes) {
    const angle = rand() * Math.PI * 2;
    const radius = 0.14 + rand() * 0.28;
    items.push({
      kind: 'trigger',
      code,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      size: 0.42 + rand() * 0.12,
      rotation: rand() * 360,
    });
  }
  return items;
}

export function EmotionImagePreview({
  emotionCode,
  triggerCodes,
  seedKey,
  size = 72,
  className,
}: {
  emotionCode: string;
  triggerCodes: string[];
  seedKey: string;
  size?: number;
  className?: string;
}) {
  const emotion = emotionMeta(emotionCode);
  const layout = buildEmotionLayout(emotionCode, triggerCodes, seedKey);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: emotion.color,
        position: 'relative',
        flexShrink: 0,
      }}
      aria-label={`${emotion.label} 감정 이미지`}
    >
      {layout.map((item, index) => {
        const s = item.size * size;
        const left = item.x * size - s / 2;
        const top = item.y * size - s / 2;
        if (item.kind === 'emotion') {
          return (
            <span
              key={`e-${index}`}
              style={{
                position: 'absolute',
                left,
                top,
                width: s,
                height: s,
                borderRadius: '50%',
                background: item.color,
                opacity: 0.95,
              }}
            />
          );
        }
        return (
          <span
            key={`t-${index}`}
            style={{
              position: 'absolute',
              left,
              top,
              width: s,
              height: s,
              display: 'grid',
              placeItems: 'center',
              transform: `rotate(${item.rotation}deg)`,
              opacity: 0.78,
            }}
          >
            <TriggerIcon code={item.code} size={s * 0.88} />
          </span>
        );
      })}
    </div>
  );
}
