import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllBlogSlugs, getBlogBySlug } from '@/lib/blogs';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] });

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
    <main className="min-h-screen px-4 py-16 flex justify-center">
      <div
        className="w-full max-w-2xl backdrop-blur-md rounded-2xl shadow-xl px-10 py-12"
        style={{ backgroundColor: 'rgba(240, 234, 210, 0.88)' }}
      >

        <Link
          href="/blog"
          className="text-sm text-copper hover:text-ash-brown transition-colors mb-10 inline-block font-medium"
        >
          ← Back to blog
        </Link>

        <header className="mb-10">
          {blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-olive/30 text-ash-brown font-medium rounded-full px-3 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className={`${playfair.className} text-4xl font-bold text-ash-brown mb-3 leading-tight`}>
            {blog.title}
          </h1>
          <p className="text-copper text-sm font-mono">{formattedDate}</p>
          {blog.description && (
            <p className="mt-4 text-ash-brown/70 text-base leading-relaxed border-l-2 border-olive pl-4">
              {blog.description}
            </p>
          )}
        </header>

        <hr className="border-ash-brown/15 mb-8" />

        <div className="space-y-5 text-ash-brown leading-relaxed text-base">
          {blog.content.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

      </div>
    </main>
  );
}
