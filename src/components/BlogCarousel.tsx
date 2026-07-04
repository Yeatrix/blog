'use client';

import Link from 'next/link';
import TiltedCard from './TiltedCard';
import type { Blog } from '@/types/blog';

interface Props {
  blogs: Blog[];
}

export default function BlogCarousel({ blogs }: Props) {
  if (blogs.length === 0) {
    return (
      <p className="text-center text-ash-brown/50 mt-16">No posts yet.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-16 py-8">
      {blogs.map((blog) => (
        <Link key={blog.slug} href={`/blog/${blog.slug}`} className="block">
          <TiltedCard
            imageSrc={blog.coverImage || '/blog-placeholder.svg'}
            altText={blog.title}
            captionText={blog.title}
            containerHeight="380px"
            containerWidth="340px"
            imageHeight="340px"
            imageWidth="340px"
            rotateAmplitude={12}
            scaleOnHover={1.05}
            showMobileWarning={false}
            showTooltip={true}
            displayOverlayContent={true}
            overlayContent={
              <div className="flex flex-col justify-end h-full p-5">
                <p className="text-xs text-cream/60 mb-1 font-mono">
                  {new Date(blog.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <h2 className="text-lg font-bold text-cream leading-tight">{blog.title}</h2>
                <p className="text-sm text-cream/80 mt-1 line-clamp-2">{blog.description}</p>
                {blog.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {blog.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-cream/20 text-cream rounded-full px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </Link>
      ))}
    </div>
  );
}
