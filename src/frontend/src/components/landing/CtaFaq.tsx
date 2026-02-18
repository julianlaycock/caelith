'use client';
import { useEffect, useState, useCallback } from 'react';
import styles from '@/app/landing/landing.module.css';

const DEADLINE = new Date('2026-04-16T00:00:00+02:00').getTime();

const FAQS = [
  { q: 'What regulatory frameworks does Caelith cover?', a: 'AIFMD II, KAGB (including §225), ELTIF 2.0, RAIF Law, SIF Law, and relevant provisions of MiFID II, DORA, and PRIIPs. 247 pre-built rules across 6 frameworks, with new regulations added quarterly.' },
  { q: 'How does the hash-chained audit trail work?', a: 'Every compliance decision is stored as a block containing the decision data, a SHA-256 hash, and the hash of the previous block. This creates a tamper-evident chain — any modification to historical records is immediately detectable.' },
  { q: 'Can I integrate Caelith with my existing systems?', a: 'Yes. Caelith provides a RESTful API for integration with transfer agents, fund administration platforms, and portfolio management systems. Enterprise plans include custom integration support.' },
  { q: 'When does AIFMD II take effect?', a: 'AIFMD II must be transposed into national law by April 16, 2026. Fund managers need to be fully compliant by this date. Caelith helps you assess readiness, model impact, and achieve compliance before the deadline.' },
  { q: 'Is my data secure?', a: 'Caelith is hosted on EU-based infrastructure (Frankfurt am Main), with end-to-end encryption, SOC 2 Type II compliance, and optional on-premise deployment for Enterprise customers. Data never leaves the EU.' },
];

export default function CtaFaq() {
  const [cd, setCd] = useState({ d: '--', h: '--', m: '--', s: '--' });
  const [openFaq, setOpenFaq] = useState(-1);

  const updateCd = useCallback(() => {
    const diff = DEADLINE - Date.now();
    if (diff <= 0) return;
    setCd({
      d: String(Math.floor(diff / 864e5)),
      h: String(Math.floor((diff % 864e5) / 36e5)).padStart(2, '0'),
      m: String(Math.floor((diff % 36e5) / 6e4)).padStart(2, '0'),
      s: String(Math.floor((diff % 6e4) / 1e3)).padStart(2, '0'),
    });
  }, []);

  useEffect(() => {
    updateCd();
    const interval = setInterval(updateCd, 1000);
    return () => clearInterval(interval);
  }, [updateCd]);

  const onBtnMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    e.currentTarget.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  };

  return (
    <section className={styles.ctaSection} id="faq" data-dark-section>
      <div className={styles.ctaInner}>
        <div className={styles.ctaCountdown}>
          <div className={styles.cdUnit}><span className={styles.cdVal}>{cd.d}</span><span className={styles.cdLabel}>Days</span></div>
          <div className={styles.cdUnit}><span className={styles.cdVal}>{cd.h}</span><span className={styles.cdLabel}>Hours</span></div>
          <div className={styles.cdUnit}><span className={styles.cdVal}>{cd.m}</span><span className={styles.cdLabel}>Minutes</span></div>
          <div className={styles.cdUnit}><span className={styles.cdVal}>{cd.s}</span><span className={styles.cdLabel}>Seconds</span></div>
        </div>
        <div className={styles.countdownContext}>until AIFMD II enforcement</div>
        <h2 className={styles.ctaTitle}>After April 16, non-compliance isn&apos;t a risk. It&apos;s a fine.</h2>
        <p className={styles.ctaSub}>Book before March 15 for complimentary onboarding and priority integration support.</p>
        <a href="mailto:hello@caelith.tech?subject=Demo%20Request" className={styles.btnPrimary} onMouseMove={onBtnMove}>
          Book a demo <span className="arrow">→</span>
        </a>
        <p className={styles.ctaEmail}>
          Or email <a href="mailto:hello@caelith.tech">hello@caelith.tech</a> — we respond within 4 hours.
        </p>

        <div className={styles.faqBlock}>
          <h3 className={styles.faqTitle}>Frequently asked questions</h3>
          {FAQS.map((faq, i) => (
            <div key={i} className={`${styles.faqItem} ${openFaq === i ? styles.faqItemOpen : ''}`}>
              <div className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                <span>{faq.q}</span>
                <span className={styles.faqToggle}>+</span>
              </div>
              <div className={styles.faqA}>
                <div className={styles.faqAInner}>{faq.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
