'use client';
import { useEffect, useRef, useCallback } from 'react';
import styles from '@/app/landing/landing.module.css';

const STATS = [
  { target: 1.8, prefix: '€', suffix: 'T', desc: 'EU AIF assets under management' },
  { target: 47, suffix: '%', desc: 'of fund managers unprepared' },
  { target: 23, prefix: '<', suffix: 'ms', desc: 'average rule evaluation' },
  { target: 4, prefix: '<', suffix: ' min', desc: 'full Annex IV report' },
];

const ROWS = [
  ['Time to audit', '2–4 weeks', '< 4 minutes'],
  ['Error rate', 'Human-dependent', 'Zero (deterministic)'],
  ['Framework coverage', '1–2 frameworks', '6 frameworks, 247 rules'],
  ['Audit evidence', 'Screenshots & emails', 'Hash-chained cryptographic proof'],
  ['Annual cost', '~€180,000', 'From €3,588/year'],
];

function animateCounter(el: HTMLElement, target: number, prefix: string, suffix: string) {
  const isFloat = target % 1 !== 0;
  const duration = 1200;
  const start = performance.now();
  function tick(now: number) {
    const p = Math.min((now - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + (isFloat ? (target * e).toFixed(1) : Math.round(target * e)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export default function Comparison() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statRowRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const setupObservers = useCallback(() => {
    // Section reveal
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealed);
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    if (sectionRef.current) revealObs.observe(sectionRef.current);

    // Stat cards visibility + counter
    const statObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const cards = e.target.querySelectorAll('[data-stat-card]');
          cards.forEach((card) => card.classList.add(styles.statCardVisible));
          const nums = e.target.querySelectorAll('[data-counter]') as NodeListOf<HTMLElement>;
          nums.forEach((el) => {
            animateCounter(
              el,
              parseFloat(el.dataset.target || '0'),
              el.dataset.prefix || '',
              el.dataset.suffix || ''
            );
          });
          statObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    if (statRowRef.current) statObs.observe(statRowRef.current);

    // Table visibility
    const tableObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.comparisonTableVisible);
          const rows = e.target.querySelectorAll('[data-table-row]');
          rows.forEach((row, i) => {
            setTimeout(() => row.classList.add(styles.tableRowVisible), i * 120);
          });
          tableObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    if (tableRef.current) tableObs.observe(tableRef.current);

    return () => {
      revealObs.disconnect();
      statObs.disconnect();
      tableObs.disconnect();
    };
  }, []);

  useEffect(() => {
    return setupObservers();
  }, [setupObservers]);

  return (
    <section ref={sectionRef} className={`${styles.comparisonSection} ${styles.revealSection}`} id="why-caelith">
      <div className={styles.comparisonInner}>
        <div className={styles.sectionLabel}>Why Caelith</div>
        <h2 className={styles.comparisonTitle}>
          €180,000/year in manual compliance.<br />Or €3,588 with Caelith.
        </h2>
        <p className={styles.comparisonLead}>
          EU AIF managers hold €1.8 trillion in assets. 47% aren&apos;t ready for AIFMD II. The question isn&apos;t whether to automate — it&apos;s whether you can afford not to.
        </p>

        <div ref={statRowRef} className={styles.statRow}>
          {STATS.map((s, i) => (
            <div key={i} className={styles.statCard} data-stat-card style={{ transitionDelay: `${i * 0.1}s` }}>
              <div
                className={styles.statNum}
                data-counter
                data-target={s.target}
                data-prefix={s.prefix || ''}
                data-suffix={s.suffix || ''}
              >
                {(s.prefix || '') + '0' + (s.suffix || '')}
              </div>
              <div className={styles.statDesc}>{s.desc}</div>
            </div>
          ))}
        </div>

        <table ref={tableRef} className={styles.comparisonTable}>
          <thead>
            <tr>
              <th></th>
              <th>Manual process</th>
              <th className={styles.caelithCol}>With Caelith</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} className={styles.tableRow} data-table-row style={{ transitionDelay: `${i * 0.12}s` }}>
                <td>{row[0]}</td>
                <td className={styles.manual}>{row[1]}</td>
                <td className={styles.caelith}>{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
