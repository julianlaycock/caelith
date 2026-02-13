import type { Metadata } from 'next';
import './globals.css';
import { AuthLayout } from '../components/auth-layout';

export const metadata: Metadata = {
  title: 'Caelith — Compliance Engine',
  description: 'Compliance infrastructure for tokenized assets',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  other: {
    'theme-color': '#0A0E1A',
  },
  openGraph: {
    title: 'Caelith — Compliance Engine',
    description: 'Compliance infrastructure for tokenized assets',
    siteName: 'Caelith',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0A0E1A" />
      </head>
      <body>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}