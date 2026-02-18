'use client';
import { useEffect, useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

const PLANS = [
  {
    tier: 'Starter', price: '€299', per: '/mo',
    desc: 'For emerging managers with a single fund.',
    features: ['1 fund, up to 100 investors', 'Core rules engine', 'Basic audit trail', 'Email support'],
    href: 'mailto:hello@caelith.tech?subject=Starter%20Plan',
    btnText: 'Get started', btnClass: 'outline',
  },
  {
    tier: 'Professional', price: '€799', per: '/mo',
    desc: 'For established managers with multiple funds.',
    features: ['Up to 10 funds, unlimited investors', 'Full rules engine + scenario modeling', 'Hash-chained audit trail', 'Regulatory reporting (Annex IV)', 'Priority support'],
    href: 'mailto:hello@caelith.tech?subject=Professional%20Plan',
    btnText: 'Get started', btnClass: 'primary', featured: true, badge: 'MOST POPULAR',
  },
  {
    tier: 'Enterprise', price: 'Custom', per: '',
    desc: 'For large AIFMs and service providers.',
    features: ['Unlimited funds and investors', 'Custom rule development', 'On-premise deployment option', 'API access + integrations', 'Dedicated account manager'],
    href: 'mailto:hello@caelith.tech?subject=Enterprise%20Inquiry',
    btnText: 'Contact sales', btnClass: 'outline',
  },
];

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);

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

    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add(styles.pricingCardVisible);
          cardObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    const cards = sectionRef.current?.querySelectorAll('[data-pricing-card]');
    cards?.forEach((c) => cardObs.observe(c));

    // 3D tilt
    const tiltCards = sectionRef.current?.querySelectorAll('[data-pricing-card]') as NodeListOf<HTMLElement>;
    const handlers: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = [];
    tiltCards?.forEach((card) => {
      const move = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${y * -6}deg) translateY(-4px)`;
      };
      const leave = () => { card.style.transform = ''; };
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      handlers.push({ el: card, move, leave });
    });

    return () => {
      revealObs.disconnect();
      cardObs.disconnect();
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', leave);
      });
    };
  }, []);

  return (
    <section ref={sectionRef} className={`${styles.pricingSection} ${styles.revealSection}`} id="pricing">
      <div className={styles.pricingInner}>
        <div className={styles.sectionLabel}>Pricing</div>
        <h2 className={styles.pricingTitle}>Simple, transparent pricing.</h2>
        <p className={styles.pricingAnchor}>
          The average AIFM spends <strong>€180,000/year</strong> on manual compliance. Caelith starts at <strong>€3,588</strong>.
        </p>
        <div className={styles.pricingGrid}>
          {PLANS.map((p, i) => (
            <div
              key={i}
              className={`${styles.pricingCard} ${p.featured ? styles.pricingCardFeatured : ''}`}
              data-pricing-card
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              {p.badge && <div className={styles.pricingBadge}>{p.badge}</div>}
              <div className={styles.pricingTier}>{p.tier}</div>
              <div className={styles.pricingPrice}>{p.price}{p.per && <span>{p.per}</span>}</div>
              <div className={styles.pricingDesc}>{p.desc}</div>
              <ul className={styles.pricingFeatures}>
                {p.features.map((f, j) => <li key={j}>{f}</li>)}
              </ul>
              <a
                href={p.href}
                className={`${styles.pricingBtn} ${p.btnClass === 'primary' ? styles.pricingBtnPrimary : styles.pricingBtnOutline}`}
              >
                {p.btnText} <span className="arrow">→</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
