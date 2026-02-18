'use client';
import styles from '@/app/landing/landing.module.css';

export default function TrustBar() {
  return (
    <section className={styles.trustSection}>
      <div className={styles.trustInner}>
        <div className={styles.trustItem}><span className={styles.trustNum}>247</span> pre-built compliance rules</div>
        <div className={styles.trustItem}><span className={styles.trustNum}>6</span> regulatory frameworks</div>
        <div className={styles.trustItem}><span className={styles.trustNum}>EU</span> hosted (Frankfurt)</div>
        <div className={styles.trustItem}><span className={styles.trustNum}>SOC 2</span> Type II</div>
      </div>
    </section>
  );
}
