'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

const TERM_LINES = [
  { text: 'Onboarding investor INV-4891...', cls: 'cmd' },
  { text: '', cls: '' },
  { text: 'Checking: Professional investor status', cls: 'dim' },
  { text: '  → Net assets > €500,000 ✓', cls: 'ok' },
  { text: 'Checking: KAGB §225 minimum investment', cls: 'dim' },
  { text: '  → Investment ≥ €200,000 ✓', cls: 'ok' },
  { text: 'Checking: Knowledge & experience test', cls: 'dim' },
  { text: '  → Assessment score: 87/100 ✓', cls: 'ok' },
  { text: 'Checking: AIFMD II concentration limit', cls: 'dim' },
  { text: '  → Fund exposure 4.2% (limit: 10%) ✓', cls: 'ok' },
  { text: '', cls: '' },
  { text: 'Result: COMPLIANT — 4/4 rules passed', cls: 'ok' },
  { text: 'Audit hash: a3f7c912...8b2de447', cls: 'hash' },
  { text: 'Chained to block #4,890 ✓', cls: 'hash' },
];

export default function Hero() {
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < window.innerHeight) {
        const p = window.scrollY / window.innerHeight;
        if (previewRef.current) previewRef.current.style.transform = `translateY(${p * -40}px)`;
        if (contentRef.current) contentRef.current.style.transform = `translateY(${p * -20}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Magnetic ripple on primary buttons
  const onBtnMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  };

  return (
    <section className={styles.hero} data-dark-section>
      <div className={styles.heroGrid}>
        <div className={styles.heroContent} ref={contentRef}>
          <div className={styles.heroLabel}>
            <span className={styles.pulseDot} /> AIFMD II COMPLIANCE ENGINE
          </div>
          <h1 className={styles.heroTitle}>
            The compliance engine for{' '}
            <span className={styles.highlight}>EU fund managers.</span>
          </h1>
          <p className={styles.heroSub}>
            247 rules. 6 frameworks. Every decision logged, verified, and cryptographically proven — before your regulator asks.
          </p>
          <div className={styles.heroCtas}>
            <a
              href="mailto:hello@caelith.tech?subject=Demo%20Request"
              className={styles.btnPrimary}
              onMouseMove={onBtnMove}
            >
              Book a demo <span className="arrow">→</span>
            </a>
            <a href="#how-it-works" className={styles.btnGhost}>See how it works</a>
          </div>
          <div className={styles.heroProof}>
            <div className={styles.proofItem}><span className={styles.proofVal}>247</span> rules</div>
            <div className={styles.proofItem}><span className={styles.proofVal}>6</span> frameworks</div>
            <div className={styles.proofItem}><span className={styles.proofVal}>&lt;23ms</span> evaluation</div>
            <div className={styles.proofItem}><span className={styles.proofVal}>SOC 2</span> certified</div>
          </div>
        </div>
        <div className={styles.heroPreview} ref={previewRef}>
          <div className={styles.heroTerminal}>
            <div className={styles.terminalBar}>
              <div className={`${styles.terminalDot} ${styles.terminalDotR}`} />
              <div className={`${styles.terminalDot} ${styles.terminalDotY}`} />
              <div className={`${styles.terminalDot} ${styles.terminalDotG}`} />
              <div className={styles.terminalTitle}>caelith — investor onboarding</div>
            </div>
            <div className={styles.terminalBody}>
              {TERM_LINES.map((line, i) => (
                <div
                  key={i}
                  className={styles.terminalLine}
                  style={{ animationDelay: `${0.8 + i * 0.15}s` }}
                >
                  {line.cls ? (
                    <span className={line.cls}>{line.text}</span>
                  ) : (
                    '\u00A0'
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
