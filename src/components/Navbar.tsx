import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-6xl items-center px-6">

            {/* Logo — left */}
            <div className="w-40 flex-shrink-0">
              <Link href="/" className="text-base font-bold tracking-tight text-ash-brown transition-colors hover:text-cream">
                lakshyakumar
              </Link>
            </div>

            {/* Links — center */}
            <div className="flex flex-1 items-center justify-center gap-8">
              <Link href="/" className="text-sm text-ash-brown/60 transition-colors hover:text-cream">Home</Link>
              <Link href="/about" className="text-sm text-ash-brown/60 transition-colors hover:text-cream">About</Link>
              <Link href="/blog" className="text-sm text-ash-brown/60 transition-colors hover:text-cream">Blog</Link>
              <Link href="/work" className="text-sm text-ash-brown/60 transition-colors hover:text-cream">Work</Link>
            </div>

            {/* CTA — right */}
            <div className="w-40 flex flex-shrink-0 justify-end">
              <Link
                href="/contact"
                className="rounded-full border border-ash-brown/40 px-4 py-1.5 text-sm text-ash-brown transition-all hover:border-ash-brown hover:bg-ash-brown hover:text-cream"
              >
                Get in touch
              </Link>
            </div>

          </nav>
        </header>
  );
}
