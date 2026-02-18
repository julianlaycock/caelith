'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const p = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      ref.current.style.width = p + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div ref={ref} className={styles.scrollProgress} />;
}
