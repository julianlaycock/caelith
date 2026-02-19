import type { Metadata } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthLayout } from '../components/auth-layout';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Caelith - Compliance Engine',
  description: 'AIFMD II compliance engine for EU alternative investment fund managers',
  applicationName: 'Caelith',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#2D3333',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
  openGraph: {
    title: 'Caelith - Compliance Engine',
    description: 'The compliance engine for EU fund managers. 247 rules. 6 frameworks. Every decision logged, verified, and cryptographically proven.',
    siteName: 'Caelith',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sora.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="theme-color" content="#2D3333" />
      </head>
      <body>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
