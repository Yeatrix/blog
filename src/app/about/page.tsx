import { Patrick_Hand } from 'next/font/google';

const hand = Patrick_Hand({ subsets: ['latin'], weight: '400' });

export default function AboutPage() {
  return (
    <main
      className={`${hand.className} flex flex-col items-center justify-center p-4 text-center`}
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      <h1 className="text-3xl md:text-5xl max-w-2xl leading-relaxed text-cream">
        huh, i&apos;m too lazy to write about myself.....instead just ask me via the
        contacts i shared lol, they&apos;re at top right cornerrrrr
      </h1>
    </main>
  );
}
