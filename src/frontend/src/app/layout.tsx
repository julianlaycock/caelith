import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthLayout } from '../components/auth-layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Codex — Compliance Engine',
  description: 'Compliance infrastructure for tokenized assets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}