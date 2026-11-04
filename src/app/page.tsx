import Link from 'next/link';

// A placeholder front door; the username search and example cities arrive with the GitHub API.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <p className="font-dot text-lg tracking-widest text-neon-pink">夜の街</p>
      <h1 className="font-pixel text-3xl leading-tight sm:text-5xl">GitCity</h1>
      <p className="max-w-md text-mist">Your GitHub repositories, rebuilt as a quiet pixel-art backstreet at night.</p>
      <Link
        href="/demo"
        className="border-2 border-neon-amber bg-night-800 px-5 py-3 font-pixel text-xs text-neon-amber transition-colors hover:bg-neon-amber hover:text-night-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-cyan"
      >
        Walk the demo city →
      </Link>
    </main>
  );
}
