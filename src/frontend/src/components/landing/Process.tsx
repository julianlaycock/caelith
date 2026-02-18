'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

const STEPS = [
  { num: '01', title: 'Map', desc: 'Upload your fund structure. Caelith auto-detects applicable frameworks across 6 jurisdictions.' },
  { num: '02', title: 'Evaluate', desc: 'Every investor is classified and validated against 247 rules. In real time. Under 23ms.' },
  { num: '03', title: 'Prove', desc: 'Each decision is hash-chained to the previous one. Tamper-proof by design. Regulator-ready by default.' },
  { num: '04', title: 'Report', desc: 'Annex IV, AIFMD II disclosures, cross-border filings. One click. Export as PDF, XML, or XBRL.' },
];

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealed);
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    if (sectionRef.current) revealObs.observe(sectionRef.current);

    const processObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (lineRef.current) lineRef.current.classList.add(styles.processLineAnimate);
          const steps = e.target.querySelectorAll('[data-process-step]');
          steps.forEach((s) => s.classList.add(styles.processStepVisible));
          processObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    if (sectionRef.current) processObs.observe(sectionRef.current);

    return () => { revealObs.disconnect(); processObs.disconnect(); };
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.processSection} ${styles.revealSection}`} id="how-it-works">
      <div className={styles.processInner}>
        <div className={styles.sectionLabel}>How it works</div>
        <h2 className={styles.processTitle}>Four steps to audit-ready.</h2>
        <div className={styles.processSteps}>
          <div ref={lineRef} className={styles.processLine} />
          {STEPS.map((s, i) => (
            <div key={i} className={styles.processStep} data-process-step style={{ transitionDelay: `${i * 0.15}s` }}>
              <div className={styles.stepNum}>{s.num}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
