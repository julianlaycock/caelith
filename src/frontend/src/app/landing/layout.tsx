import { Sora, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      {children}
    </div>
  );
}
