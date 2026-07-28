import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BoltEdit — AI Code Generation Platform',
  description:
    'Open-source, browser-based AI code generation and execution platform. Generate, install, and run full-stack apps live in your browser.',
  openGraph: {
    title: 'BoltEdit — AI Code Generation Platform',
    description:
      'Generate and run full-stack web apps in your browser with AI. Powered by OpenRouter and WebContainers.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
