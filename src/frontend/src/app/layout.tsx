import type { Metadata } from 'next';
import './globals.css';
import { AuthLayout } from '../components/auth-layout';

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
    'theme-color': '#D2CFBE',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
  openGraph: {
    title: 'Caelith - Compliance Engine',
    description: 'AIFMD II compliance engine for EU alternative investment fund managers',
    siteName: 'Caelith',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#D2CFBE" />
      </head>
      <body>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
