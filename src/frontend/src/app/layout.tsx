import type { Metadata } from 'next';
import './globals.css';
import { AuthLayout } from '../components/auth-layout';

export const metadata: Metadata = {
  title: 'Caelith — Compliance Engine',
  description: 'Compliance infrastructure for tokenized assets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}