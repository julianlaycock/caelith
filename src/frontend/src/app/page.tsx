'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page — routes based on context:
 * - Installed PWA (standalone): → /login (or /dashboard if already authenticated)
 * - Browser: → landing page (handled by next.config.mjs rewrite to /api/landing)
 *
 * The rewrite in next.config.mjs serves the landing page for `/` in browser mode.
 * This client component only runs when the rewrite doesn't apply (e.g., client-side nav).
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      // Installed app — check if already logged in
      const token = localStorage.getItem('caelith_token');
      router.replace(token ? '/dashboard' : '/login');
    } else {
      // Browser — go to login (landing page is served by the rewrite for direct URL access)
      const token = localStorage.getItem('caelith_token');
      if (token) {
        router.replace('/dashboard');
      }
      // If no token and in browser, the beforeFiles rewrite already served the landing page
      // This code only runs on client-side navigation to /, so redirect to login
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  return null;
}
