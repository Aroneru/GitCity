import type { Metadata } from 'next';
import Link from 'next/link';
import { CityPanorama } from '@/components/city/CityPanorama';
import { RuleLegend } from '@/components/city/RuleLegend';
import { createDemoSnapshot } from '@/lib/mock/demo';

export const metadata: Metadata = {
  title: 'Demo city',
  description: 'A fictional developer’s repositories as one street, showing every building rule.',
};

export default function DemoPage() {
  const snapshot = createDemoSnapshot();

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="font-pixel text-sm text-paper hover:text-neon-amber">
            GitCity
          </Link>
          <h1 className="font-dot text-mist">Demo city · {snapshot.repos.length} repos</h1>
        </div>
        <p className="text-sm text-mist">Scroll sideways to walk the street.</p>
      </header>
      <CityPanorama snapshot={snapshot} />
      <RuleLegend />
    </main>
  );
}
