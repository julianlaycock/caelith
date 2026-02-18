'use client';
import { useEffect, useRef, useCallback } from 'react';
import styles from '@/app/landing/landing.module.css';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ cx: 0, cy: 0, dx: 0, dy: 0 });

  const animate = useCallback(() => {
    const p = pos.current;
    p.cx += (p.dx - p.cx) * 0.12;
    p.cy += (p.dy - p.cy) * 0.12;
    if (cursorRef.current) {
      cursorRef.current.style.left = p.cx + 'px';
      cursorRef.current.style.top = p.cy + 'px';
    }
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current.dx = e.clientX;
      pos.current.dy = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px';
        dotRef.current.style.top = e.clientY + 'px';
      }
    };

    // Dark section detection
    const darkSections = document.querySelectorAll(
      '[data-dark-section]'
    );
    const checkDark = () => {
      if (!cursorRef.current || !dotRef.current) return;
      let isDark = false;
      const y = pos.current.dy;
      darkSections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) isDark = true;
      });
      cursorRef.current.classList.toggle(styles.cursorDark, isDark);
      dotRef.current.classList.toggle(styles.cursorDotDark, isDark);
    };

    // Hover state
    const addHover = () => cursorRef.current?.classList.add(styles.cursorHover);
    const removeHover = () => cursorRef.current?.classList.remove(styles.cursorHover);
    const interactiveEls = document.querySelectorAll('a,button,[data-cursor-hover]');
    interactiveEls.forEach((el) => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', removeHover);
    });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousemove', checkDark);
    const raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousemove', checkDark);
      cancelAnimationFrame(raf);
      interactiveEls.forEach((el) => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', removeHover);
      });
    };
  }, [animate]);

  return (
    <>
      <div ref={cursorRef} className={styles.cursor} />
      <div ref={dotRef} className={styles.cursorDot} />
    </>
  );
}
