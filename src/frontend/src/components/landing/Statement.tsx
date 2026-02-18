'use client';
import styles from '@/app/landing/landing.module.css';

const ITEMS = [
  { text: 'Compliance is not a feature —', accent: false },
  { text: "it's the product.", accent: true },
  { text: '247 rules.', accent: false },
  { text: 'Zero gaps.', accent: true },
  { text: 'Hash-chained proof.', accent: false },
  { text: 'Regulator-ready.', accent: true },
];

export default function Statement() {
  return (
    <section className={styles.statementSection} data-dark-section>
      <div className={styles.statementTrack}>
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className={item.accent ? styles.accentWord : undefined}>
            {item.text}
          </span>
        ))}
      </div>
    </section>
  );
}
