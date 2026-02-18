'use client';
import { useEffect, useState, useCallback } from 'react';
import styles from '@/app/landing/landing.module.css';

const DEADLINE = new Date('2026-04-16T00:00:00+02:00').getTime();

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState('');

  const updateCountdown = useCallback(() => {
    const diff = DEADLINE - Date.now();
    if (diff <= 0) return;
    const d = Math.floor(diff / 864e5);
    const h = String(Math.floor((diff % 864e5) / 36e5)).padStart(2, '0');
    setCountdown(`${d}d ${h}h`);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(interval);
    };
  }, [updateCountdown]);

  const navClass = `${styles.nav} ${scrolled ? styles.navScrolled : ''}`;

  return (
    <>
      <nav className={navClass} data-dark-section>
        <div className={styles.navLeft}>
          <a href="#" className={styles.navLogo}>Caelith</a>
          <div className={styles.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="/login">Sign in</a>
          </div>
        </div>
        <div className={styles.navRight}>
          <span className={styles.navCountdown}>{countdown}</span>
          <a href="mailto:hello@caelith.tech?subject=Demo%20Request" className={styles.navCta} style={{ textDecoration: 'none' }}>
            Book a demo <span className="arrow">→</span>
          </a>
          <button
            className={styles.navHamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`}>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        <a href="/login" onClick={() => setMenuOpen(false)}>Sign in</a>
        <a href="mailto:hello@caelith.tech?subject=Demo%20Request" onClick={() => setMenuOpen(false)}>Book a demo</a>
      </div>
    </>
  );
}
