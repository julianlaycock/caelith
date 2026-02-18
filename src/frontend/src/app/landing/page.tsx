'use client';

import styles from './landing.module.css';
import CustomCursor from '@/components/landing/CustomCursor';
import ScrollProgress from '@/components/landing/ScrollProgress';
import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import TrustBar from '@/components/landing/TrustBar';
import Comparison from '@/components/landing/Comparison';
import Statement from '@/components/landing/Statement';
import Product from '@/components/landing/Product';
import Network from '@/components/landing/Network';
import Process from '@/components/landing/Process';
import Pricing from '@/components/landing/Pricing';
import CtaFaq from '@/components/landing/CtaFaq';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className={styles.landingPage}>
      <CustomCursor />
      <ScrollProgress />
      <LandingNav />
      <Hero />
      <TrustBar />
      <Comparison />
      <Statement />
      <Product />
      <Network />
      <Process />
      <Pricing />
      <CtaFaq />
      <Footer />
    </div>
  );
}
