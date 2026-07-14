import { Patrick_Hand } from 'next/font/google';

const hand = Patrick_Hand({ subsets: ['latin'], weight: '400' });

export default function WorkPage() {
  return (
    <main
      className={`${hand.className} flex flex-col items-center justify-center p-4 text-center`}
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      <h1 className="text-3xl md:text-5xl max-w-2xl leading-relaxed text-cream">
        sooner or later i will add projects that i feel proud of...wait until then
      </h1>
    </main>
  );
}
