import { ExampleCities } from '@/components/city/ExampleCities';
import { UsernameForm } from '@/components/landing/UsernameForm';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-5">
        <p className="font-dot text-lg tracking-[0.3em] text-neon-pink [text-shadow:0_0_12px_currentColor]">夜の街</p>
        <h1 className="font-pixel text-3xl leading-tight sm:text-5xl">GitCity</h1>
        <p className="max-w-md text-mist">
          Type a GitHub username and walk its repositories as a quiet pixel-art backstreet at night.
        </p>
      </div>
      <UsernameForm />
      <section aria-labelledby="examples-heading" className="flex flex-col items-center gap-3">
        <h2 id="examples-heading" className="font-dot text-sm text-mist">
          Or take a walk through
        </h2>
        <ExampleCities />
      </section>
    </main>
  );
}
