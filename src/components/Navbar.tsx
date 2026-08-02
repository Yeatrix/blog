import Link from 'next/link';

const linkStyle =
  'text-[11px] uppercase tracking-[0.18em] text-cream/80 transition-colors hover:text-cream';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50">
      <nav className="relative flex h-16 items-center justify-between px-6">
        {/* Pages — left corner */}
        <div className="flex items-center gap-6">
          <Link href="/work" className={linkStyle}>Work</Link>
          <Link href="/blog" className={linkStyle}>Blog</Link>
          <Link href="/about" className={linkStyle}>Hello</Link>
        </div>

        {/* Home — center, mirrors the ✳ mark on the homepage */}
        <Link
          href="/"
          aria-label="Home"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-cream/80 transition-colors hover:text-cream select-none"
        >
          ✳
        </Link>

        {/* Socials / contact — right corner */}
        <div className="flex items-center gap-6">
          <a href="https://github.com/Yeatrix" target="_blank" rel="noreferrer" className={linkStyle}>GitHub</a>
          <a href="https://www.linkedin.com/in/lakshya-kumar-5a205a258/" target="_blank" rel="noreferrer" className={linkStyle}>Lin</a>
          <a href="https://www.instagram.com/lxshayyy" target="_blank" rel="noreferrer" className={linkStyle}>Insta</a>
        </div>
      </nav>
    </header>
  );
}
