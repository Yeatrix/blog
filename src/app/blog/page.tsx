import { getAllBlogs } from '@/lib/blogs';
import BlogGrid from '@/components/BlogGrid';
import { Patrick_Hand } from 'next/font/google';

// same hand-printed style as the diary pages
const hand = Patrick_Hand({ subsets: ['latin'], weight: '400' });

export default function BlogPage() {
  const blogs = getAllBlogs();

  return (
    <main className={`${hand.className} mx-auto max-w-6xl px-6 pt-10 pb-24`}>
      <header className="mb-10 flex items-end justify-between border-b border-cream/10 pb-8">
        <div>
          <p className="text-base uppercase tracking-[0.2em] text-cream/50 mb-3">
            The Journal
          </p>
          <h1 className="text-6xl text-cream">things i want, learnt, cherish</h1>
        </div>
        <p className="text-cream/40 text-lg pb-1">
          {blogs.length} {blogs.length === 1 ? 'entry' : 'entries'}
        </p>
      </header>

      <BlogGrid blogs={blogs} />
    </main>
  );
}
