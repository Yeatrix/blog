import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-6xl items-center px-6">

            {/* Logo — left */}
            <div className="w-40 flex-shrink-0">
              <Link href="/" className="text-base font-bold tracking-tight text-cream transition-colors hover:text-olive">
                lakshyakumar
              </Link>
            </div>

            {/* Links — center */}
            <div className="flex flex-1 items-center justify-center gap-8">
              <Link href="/" className="text-sm text-cream/50 transition-colors hover:text-cream">Home</Link>
              <Link href="/about" className="text-sm text-cream/50 transition-colors hover:text-cream">About</Link>
              <Link href="/blog" className="text-sm text-cream/50 transition-colors hover:text-cream">Blog</Link>
              <Link href="/work" className="text-sm text-cream/50 transition-colors hover:text-cream">Work</Link>
            </div>

            {/* CTA — right */}
            <div className="w-40 flex flex-shrink-0 justify-end">
              <Link
                href="/contact"
                className="rounded-full border border-cream/30 px-4 py-1.5 text-sm text-cream transition-all hover:border-cream hover:bg-cream hover:text-black"
              >
                Get in touch
              </Link>
            </div>

          </nav>
        </header>
  );
}
