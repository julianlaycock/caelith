'use client';
import { useRef } from 'react';
import styles from '@/app/landing/landing.module.css';

export default function Footer() {
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inputRef.current?.value || '';
    window.location.href = `mailto:hello@caelith.tech?subject=Early%20Access&body=Email:%20${email}`;
  };

  return (
    <footer className={styles.footer} data-dark-section>
      <div className={styles.footerCta}>
        <p>Get early access before AIFMD II enforcement.</p>
        <form className={styles.footerCtaForm} onSubmit={onSubmit}>
          <input ref={inputRef} type="email" className={styles.footerCtaInput} placeholder="you@fund.eu" required />
          <button type="submit" className={styles.footerCtaBtn}>
            Request access <span className="arrow">→</span>
          </button>
        </form>
      </div>
      <div className={styles.footerBadges}>
        <div className={styles.badge}>🇪🇺 EU Data Residency</div>
        <div className={styles.badge}>🔒 SOC 2 Type II</div>
        <div className={styles.badge}>✓ GDPR Compliant</div>
        <div className={styles.badge}>🛡️ ISO 27001</div>
      </div>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerLogo}>Caelith</div>
          <p>The compliance engine for European fund managers. Every decision logged, verified, and proven.</p>
        </div>
        <div className={styles.footerCol}>
          <h4>Product</h4>
          <a href="#">Rules Engine</a>
          <a href="#">Audit Trail</a>
          <a href="#">Reporting</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className={styles.footerCol}>
          <h4>Company</h4>
          <a href="#">About</a>
          <a href="#">Blog</a>
          <a href="#">Careers</a>
          <a href="mailto:hello@caelith.tech">Contact</a>
        </div>
        <div className={styles.footerCol}>
          <h4>Legal</h4>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="#">Imprint</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>Made in Frankfurt am Main</span>
        <span>© 2026 Caelith. All rights reserved.</span>
      </div>
    </footer>
  );
}
