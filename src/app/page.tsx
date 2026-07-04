import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function HomePage() {
  return (
    <main className="flex vh items-center justify-center">
      <h1 className={`${playfair.className} text-7xl font-bold text-cream pt-[130px]`}>
        LAKSHYA KUMAR
      </h1>
    </main>
  );
}
