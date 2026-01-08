import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { RootLayoutProviders } from '@/components/layouts/root-layout-providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Life Assistant AI',
    template: '%s | Life Assistant AI',
  },
  description: 'Seu assistente pessoal com IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootLayoutProviders>{children}</RootLayoutProviders>
      </body>
    </html>
  );
}
