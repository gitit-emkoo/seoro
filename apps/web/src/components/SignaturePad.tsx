'use client';

import { useEffect, useRef, useState } from 'react';
import { SlideToConfirm } from '@/components/SlideToConfirm';

/**
 * 서명 캔버스 + 슬라이드 확정.
 * 획이 있으면 SlideToConfirm으로 dataUrl을 onAction에 넘긴다.
 */
export function SignaturePad({
  actionLabel,
  onAction,
  busy = false,
  clearLabel = '다시 서명',
}: {
  actionLabel: string;
  onAction: (dataUrl: string) => void | Promise<void>;
  busy?: boolean;
  clearLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);
  const canvasH = 180;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 320;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = canvasH * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${canvasH}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, canvasH);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setHasStroke(false);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (busy) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    setHasStroke(true);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || busy) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function clear() {
    if (busy) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvasH);
    setHasStroke(false);
  }

  async function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke || busy) return;
    const dataUrl = canvas.toDataURL('image/png');
    await onAction(dataUrl);
  }

  return (
    <div className="signature-pad stack">
      <div className="signature-canvas-wrap">
        {!hasStroke ? (
          <span className="signature-guide" aria-hidden>
            여기에 서명
          </span>
        ) : null}
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <SlideToConfirm
        label={actionLabel}
        doneLabel="처리 중…"
        disabled={!hasStroke}
        busy={busy}
        onConfirm={submit}
      />
      <button className="btn btn-ghost" type="button" disabled={busy} onClick={clear}>
        {clearLabel}
      </button>
    </div>
  );
}
