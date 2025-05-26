'use client';
import './globals.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from './providers';
import { Toaster } from 'react-hot-toast';
import { createContext, useContext, useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

const ThemeContext = createContext({ darkMode: false, setDarkMode: (v: boolean) => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export const metadata: Metadata = {
  title: 'Byte-Me-Hack',
  description: 'A modern chat application with Next.js, Socket.IO, and AI-powered features.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    // Detect system preference on first load
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') setDarkMode(true);
    else if (saved === '0') setDarkMode(false);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setDarkMode(true);
  }, []);
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode ? '1' : '0');
  }, [darkMode]);
  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <html lang="en">
        <body className={inter.className}>
          <Providers>
            {children}
          </Providers>
          <Toaster position="top-right" />
        </body>
      </html>
    </ThemeContext.Provider>
  );
}