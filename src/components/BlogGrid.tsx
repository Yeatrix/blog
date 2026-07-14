'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import TiltedCard from './TiltedCard';
import type { Blog } from '@/types/blog';

interface Props {
  blogs: Blog[];
}

const TOP_TAGS = 6; // chips shown before "+ n more"

export default function BlogGrid({ blogs }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // tags ranked by how many posts use them
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of blogs) for (const t of b.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [blogs]);

  // collapsed: top tags only — but never hide the active one
  const shownTags = expanded
    ? tags
    : tags.slice(0, TOP_TAGS).concat(
        activeTag && !tags.slice(0, TOP_TAGS).includes(activeTag) ? [activeTag] : []
      );
  const hiddenCount = tags.length - Math.min(TOP_TAGS, tags.length);

  const visible = activeTag
    ? blogs.filter((b) => b.tags.includes(activeTag))
    : blogs;

  if (blogs.length === 0) {
    return <p className="text-center text-cream/40 mt-16">No posts yet.</p>;
  }

  return (
    <div>
      {/* tag filter */}
      <div className="flex flex-wrap items-center gap-2 mb-12">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-[11px] uppercase tracking-[0.15em] rounded-full border px-3.5 py-1.5 transition-colors ${
            activeTag === null
              ? 'border-cream bg-cream text-black'
              : 'border-cream/25 text-cream/60 hover:border-cream/60 hover:text-cream'
          }`}
        >
          All
        </button>
        {shownTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            className={`text-[11px] uppercase tracking-[0.15em] rounded-full border px-3.5 py-1.5 transition-colors ${
              activeTag === tag
                ? 'border-cream bg-cream text-black'
                : 'border-cream/25 text-cream/60 hover:border-cream/60 hover:text-cream'
            }`}
          >
            {tag}
          </button>
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] uppercase tracking-[0.15em] px-2 py-1.5 text-cream/40 hover:text-cream transition-colors"
          >
            {expanded ? '− less' : `+ ${hiddenCount} more`}
          </button>
        )}
      </div>

      {/* card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14 justify-items-center">
        {visible.map((blog) => (
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
              showTooltip={false}
              displayOverlayContent={true}
              overlayContent={
                <div className="flex flex-col justify-end h-full p-5">
                  <p className="text-sm text-cream/60 mb-1">
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

      {visible.length === 0 && (
        <p className="text-center text-cream/40 mt-16">Nothing tagged “{activeTag}” yet.</p>
      )}
    </div>
  );
}
