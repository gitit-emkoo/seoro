'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 서명 캔버스 + 단일 액션 버튼.
 * actionLabel 클릭 시 캔버스 이미지를 만들어 onAction에 넘긴다.
 * (서명 완료 / 전송 버튼 중복을 없애기 위함)
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 320;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = 150 * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = '150px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, 150);
      ctx.strokeStyle = '#2a2430';
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
    ctx.fillRect(0, 0, canvas.clientWidth, 150);
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
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <div className="btn-row">
        <button
          className="btn btn-primary"
          type="button"
          disabled={!hasStroke || busy}
          onClick={() => void submit()}
        >
          {actionLabel}
        </button>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={clear}>
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
