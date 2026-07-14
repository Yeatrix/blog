import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllBlogSlugs, getBlogBySlug } from '@/lib/blogs';
import { Patrick_Hand } from 'next/font/google';

// hand-printed diary style (Diary of a Wimpy Kid vibes)
const hand = Patrick_Hand({ subsets: ['latin'], weight: '400' });

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);
  if (!blog) notFound();

  const formattedDate = new Date(blog.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className={`${hand.className} min-h-screen px-4 py-16 flex justify-center`}>
      <div
        className="w-full max-w-2xl backdrop-blur-md rounded-2xl shadow-xl px-10 py-12"
        style={{ backgroundColor: 'rgba(240, 234, 210, 0.92)' }}
      >
        <Link
          href="/blog"
          className="text-lg text-copper hover:text-ash-brown transition-colors mb-8 inline-block"
        >
          ← back to the diary
        </Link>

        <header className="mb-8">
          {blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-base bg-olive/30 text-ash-brown rounded-full px-3 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-5xl text-ash-brown mb-2 leading-tight">{blog.title}</h1>
          <p className="text-copper text-lg">{formattedDate}</p>
          {blog.description && (
            <p className="mt-4 text-ash-brown/70 text-xl leading-relaxed border-l-2 border-olive pl-4">
              {blog.description}
            </p>
          )}
        </header>

        {/* ruled notebook lines: text line-height matches the line spacing */}
        <div
          className="text-ash-brown text-2xl"
          style={{
            lineHeight: '38px',
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 37px, rgba(108, 88, 76, 0.18) 37px, rgba(108, 88, 76, 0.18) 38px)',
          }}
        >
          {blog.content.split('\n\n').map((para, i) => (
            <p key={i} className="mb-[38px]">
              {para}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
