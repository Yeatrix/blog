import fs from 'fs';
import path from 'path';
import type { Blog } from '@/types/blog';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blogs');

export function getAllBlogs(): Blog[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  const blogs = files.map((f) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
    return JSON.parse(raw) as Blog;
  });
  return blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogBySlug(slug: string): Blog | null {
  if (!fs.existsSync(CONTENT_DIR)) return null;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
    const blog = JSON.parse(raw) as Blog;
    if (blog.slug === slug) return blog;
  }
  return null;
}

export function getAllBlogSlugs(): string[] {
  return getAllBlogs().map((b) => b.slug);
}
