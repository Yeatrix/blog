import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'lakshyakumar',
  description: 'my personal dumpyard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className="min-h-screen bg-cream font-sans text-ash-brown antialiased"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
        }}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
