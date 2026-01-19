'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom animated cursor:
 * - Tiny glowing microphone inside a circular AI halo
 * - Soft blue waves pulse outward when the cursor moves
 * - Respects prefers-reduced-motion and only runs on fine pointers
 */
export function CursorGlow() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || prefersReduce) return;

    const el = cursorRef.current;
    const wave = waveRef.current;
    if (!el || !wave) return;

    document.documentElement.classList.add('has-custom-cursor');

    const triggerWave = () => {
      wave.classList.remove('cursor-wave');
      // force reflow to restart animation
      void wave.offsetWidth;
      wave.classList.add('cursor-wave');
    };

    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      el.classList.remove('cursor-idle');
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        el.classList.add('cursor-idle');
      }, 1400);
      triggerWave();
      if (raf.current === null) {
        raf.current = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      const dx = target.current.x - pos.current.x;
      const dy = target.current.y - pos.current.y;
      pos.current.x += dx * 0.2;
      pos.current.y += dy * 0.2;
      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', handleMove);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="fixed left-0 top-0 z-[9999] pointer-events-none h-8 w-8 -translate-x-1/2 -translate-y-1/2 opacity-95 will-change-transform transition-opacity duration-300"
    >
      <div
        ref={waveRef}
        className="absolute inset-0 rounded-full opacity-70 bg-[radial-gradient(circle_at_center,rgba(83,156,255,0.28)_0%,rgba(83,156,255,0.08)_45%,rgba(12,25,48,0)_70%)]"
      />
      <span className="custom-cursor-mic block h-full w-full rounded-full bg-[radial-gradient(circle_at_center,_rgba(83,156,255,0.95)_0%,_rgba(83,156,255,0.65)_48%,_rgba(12,25,48,0)_68%)] shadow-[0_0_14px_rgba(83,156,255,0.35),0_0_24px_rgba(83,156,255,0.2)] ring-[1.5px] ring-[rgba(83,156,255,0.6)] animate-cursor-pulse">
        <span className="custom-cursor-mic-icon" />
      </span>
    </div>
  );
}
