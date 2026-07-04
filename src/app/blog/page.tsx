import { getAllBlogs } from '@/lib/blogs';
import BlogCarousel from '@/components/BlogCarousel';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });

export default function BlogPage() {
  const blogs = getAllBlogs();

  return (
    <main className="flex flex-col px-6 pt-14 pb-6" style={{ height: 'calc(100vh - 4rem)' }}>
      <h1 className={`${playfair.className} text-5xl font-bold text-cream text-center mb-10 flex-shrink-0`}>
        junk and trash
      </h1>
      <div className="flex-1 overflow-y-auto blog-scroll">
        <BlogCarousel blogs={blogs} />
      </div>
    </main>
  );
}
