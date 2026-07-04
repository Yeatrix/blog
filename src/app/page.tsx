import { Playfair_Display } from 'next/font/google';
import ModelViewer from '@/components/ModelViewer';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export default function HomePage() {
  return (
    <main className="relative" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* 3D model fills the full area */}
      <div className="absolute inset-0">
        <ModelViewer src="/models/town.gltf" />
      </div>

      {/* Title floats on top */}
      <div className="absolute bottom-12 left-14 z-10">
        <h1 className={`${playfair.className} text-7xl font-bold text-cream`}>
          LAKSHYA KUMAR
        </h1>
      </div>
    </main>
  );
}
