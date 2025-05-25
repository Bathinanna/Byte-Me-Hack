import './globals.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Byte-Me-Hack',
  description: 'A modern chat application with Next.js, Socket.IO, and AI-powered features.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}