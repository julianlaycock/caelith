'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import styles from '@/app/landing/landing.module.css';

const INITIAL_ROWS = [
  { inv: 'INV-4891', fw: 'AIFMD II', rule: 'Classification', pass: true },
  { inv: 'INV-4892', fw: 'KAGB §225', rule: 'Min. Investment', pass: true },
  { inv: 'INV-4893', fw: 'ELTIF 2.0', rule: 'Eligibility', pass: false },
  { inv: 'INV-4894', fw: 'AIFMD II', rule: 'Knowledge Test', pass: true },
  { inv: 'INV-4895', fw: 'SIF Law', rule: 'Qualified Check', pass: true },
];

const FEATURES = [
  {
    title: 'Rules engine',
    desc: '247 pre-built rules covering AIFMD II, KAGB, ELTIF 2.0, and more. Each rule evaluates investor eligibility, concentration limits, and transfer restrictions in under 23ms.',
    code: 'rule: investor_classification\nframework: AIFMD_II\nevaluate: eligibility → professional | semi_pro | retail\ncheck: [min_investment, knowledge_test, aum_threshold]\nresult: PASS | FAIL | REVIEW → audit_log',
    defaultOpen: true,
  },
  {
    title: 'Hash-chained audit trail',
    desc: 'Every compliance decision is cryptographically linked to the previous one. Immutable, verifiable, regulator-ready. No decision can be altered without detection.',
    code: 'block_4891:\n  hash: "a3f7...c912"\n  prev: "8b2d...e447"\n  action: investor_onboarded\n  result: COMPLIANT\n  timestamp: 2026-02-18T09:14:22Z',
  },
  {
    title: 'Regulatory reporting',
    desc: 'Generate Annex IV reports, AIFMD II disclosures, and cross-border marketing notifications automatically. Export-ready for BaFin, CSSF, FMA, and AMF.',
    code: 'report: annex_iv_q4_2025\nstatus: generated\nentities: 14 funds, 2,847 investors\nfindings: 3 breaches (auto-resolved)\nexport: [PDF, XML, XBRL]',
  },
  {
    title: 'Scenario modeling',
    desc: 'Test regulatory changes before they take effect. Model AIFMD II impact on your investor base, simulate new concentration limits, preview compliance outcomes.',
    code: 'scenario: aifmd_ii_semi_pro_threshold\nchange: min_investment 125k → 100k\naffected: 347 investors\nnew_eligible: +89 investors\ncompliance_impact: 12 rules re-evaluated → 0 breaches',
  },
];

export default function Product() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [openFeature, setOpenFeature] = useState(0);
  const [dashVals, setDashVals] = useState({ investors: '0', rules: '0', rate: '0%', ms: '0ms' });
  const [dashRows, setDashRows] = useState(INITIAL_ROWS);
  const [dashTime, setDashTime] = useState('Last evaluated: just now');
  const [newRowIdx, setNewRowIdx] = useState(-1);
  const dashAnimated = useRef(false);

  const animateDash = useCallback(() => {
    const duration = 1400;
    const start = performance.now();
    const targets = { investors: 2847, rules: 14200, rate: 99.7, ms: 18 };
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDashVals({
        investors: Math.round(targets.investors * e).toLocaleString(),
        rules: (targets.rules * e / 1000).toFixed(1) + 'K',
        rate: (targets.rate * e).toFixed(1) + '%',
        ms: Math.round(targets.ms * e) + 'ms',
      });
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Inject new row after 3s
    setTimeout(() => {
      setDashRows((prev) => {
        const next = [
          { inv: 'INV-4896', fw: 'AIFMD II', rule: 'Concentration', pass: true },
          ...prev.slice(0, 4),
        ];
        return next;
      });
      setNewRowIdx(0);
      setDashTime('Last evaluated: just now');
    }, 3000);

    // Time counter
    let sec = 0;
    const interval = setInterval(() => {
      sec++;
      setDashTime(`Last evaluated: ${sec}s ago`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Reveal
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.revealed);
          revealObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    if (sectionRef.current) revealObs.observe(sectionRef.current);

    // Browser frame
    const frameObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.browserFrameVisible);
          if (!dashAnimated.current) {
            dashAnimated.current = true;
            animateDash();
          }
          frameObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    if (frameRef.current) frameObs.observe(frameRef.current);

    return () => {
      revealObs.disconnect();
      frameObs.disconnect();
    };
  }, [animateDash]);

  const toggleFeature = (i: number) => {
    setOpenFeature(openFeature === i ? -1 : i);
  };

  return (
    <section ref={sectionRef} className={`${styles.productSection} ${styles.revealSection}`}>
      <div className={styles.productInner}>
        <div className={styles.sectionLabel}>The product</div>
        <h2 className={styles.productTitle}>See it in action.</h2>
        <p className={styles.productSub}>
          Real-time rule evaluation, hash-chained audit trails, and automated regulatory reporting — one dashboard.
        </p>
        <div className={styles.browserWrap}>
          <div ref={frameRef} className={styles.browserFrame}>
            <div className={styles.browserHeader}>
              <div className={styles.browserDots}>
                <div className={`${styles.browserDot} ${styles.browserDotRed}`} />
                <div className={`${styles.browserDot} ${styles.browserDotYellow}`} />
                <div className={`${styles.browserDot} ${styles.browserDotGreen}`} />
              </div>
              <div className={styles.browserUrl}>app.caelith.tech/dashboard</div>
            </div>
            <div className={styles.browserBody}>
              <div className={styles.browserSidebar}>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>◉ Dashboard</div>
                <div className={styles.sidebarItem}>○ Investors</div>
                <div className={styles.sidebarItem}>○ Rules Engine</div>
                <div className={styles.sidebarItem}>○ Audit Trail</div>
                <div className={styles.sidebarItem}>○ Reports</div>
                <div className={styles.sidebarItem}>○ Settings</div>
              </div>
              <div className={styles.browserMain}>
                <div className={styles.dashLive}>
                  <span className={styles.liveDot} />
                  <span>{dashTime}</span>
                </div>
                <div className={styles.dashStats}>
                  <div className={styles.dashStatCard}><div className="label">Total Investors</div><div className="value">{dashVals.investors}</div></div>
                  <div className={styles.dashStatCard}><div className="label">Rules Evaluated</div><div className="value">{dashVals.rules}</div></div>
                  <div className={styles.dashStatCard}><div className="label">Compliance Rate</div><div className="value">{dashVals.rate}</div></div>
                  <div className={styles.dashStatCard}><div className="label">Avg. Response</div><div className="value">{dashVals.ms}</div></div>
                </div>
                <div className={styles.dashSectionTitle}>Recent compliance decisions</div>
                <div className={styles.dashTable}>
                  <div className={styles.dashTableHeader}>
                    <span>Investor</span><span>Framework</span><span>Rule</span><span>Status</span>
                  </div>
                  {dashRows.map((row, i) => (
                    <div
                      key={row.inv + i}
                      className={`${styles.dashTableRow} ${i === newRowIdx ? styles.newRow : ''}`}
                    >
                      <span>{row.inv}</span>
                      <span>{row.fw}</span>
                      <span>{row.rule}</span>
                      <span>
                        <span className={row.pass ? styles.badgePass : styles.badgeFail}>
                          {row.pass ? 'PASS' : 'FAIL'}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.productNote}>Complimentary 90-day evaluation for qualified AIFMs.</p>

        <div className={styles.featuresGrid}>
          <h3 className={styles.featuresTitle}>Under the hood</h3>
          {FEATURES.map((f, i) => (
            <div key={i} className={`${styles.featureCard} ${openFeature === i ? styles.featureCardOpen : ''}`}>
              <div className={styles.featureHeader} onClick={() => toggleFeature(i)}>
                <span className={styles.featureTitle}>{f.title}</span>
                <span className={styles.featureToggle}>+</span>
              </div>
              <div className={styles.featureBody}>
                <div className={styles.featureBodyInner}>
                  <p className={styles.featureDesc}>{f.desc}</p>
                  <div className={styles.featureCode}>
                    {f.code.split('\n').map((line, j) => (
                      <span key={j}>{line}<br /></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
