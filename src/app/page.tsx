'use client';

import { useState } from 'react';
import { Bodoni_Moda } from 'next/font/google';
import Scene from '@/components/Scene';

// High-contrast Didone serif — the "Mahdis" editorial look
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

export default function HomePage() {
  const [moved, setMoved] = useState(false);

  return (
    // fixed inset-0 makes the scene fill the whole viewport, so it renders
    // behind the transparent navbar (which stays on top via its z-50)
    <main className="fixed inset-0">
      <Scene onFirstMove={() => setMoved(true)} />

      {/* --- Editorial overlay: fades out on first movement --- */}
      <div
        className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-[1500ms] ease-out ${
          moved ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* edition credit — left edge, mid height */}
        <p className="absolute left-6 top-1/2 -translate-y-1/2 text-cream/80 text-[11px] tracking-[0.08em]">
          roadtodev edition
        </p>

        {/* giant name — center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className={`${bodoni.className} text-cream font-normal leading-none whitespace-nowrap`}
            style={{ fontSize: '13vw' }}
          >
            Lakshya
            <sup
              className="align-super font-normal"
              style={{ fontSize: '1.6vw', letterSpacing: '0.05em', verticalAlign: '2.2em' }}
            >
              (kumar)
            </sup>
          </h1>
        </div>

        {/* bio — bottom left, two staggered columns, small caps */}
        <div className="absolute bottom-10 left-24 flex gap-8 text-cream/90 text-[10px] leading-relaxed tracking-[0.12em] uppercase">
          <p className="w-44">
            Associate software developer
            <br />
            living and working in Bangalore.
          </p>
          <p className="w-44">
            A big passion for code,
            <br />
            graphics and 3d design.
          </p>
        </div>
      </div>
    </main>
  );
}
