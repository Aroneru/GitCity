import type { Metadata } from 'next';
import { CityHeader } from '@/components/city/CityHeader';
import { CityPanorama } from '@/components/city/CityPanorama';
import { RuleLegend } from '@/components/city/RuleLegend';
import { createDemoSnapshot } from '@/lib/mock/demo';

export const metadata: Metadata = {
  title: 'Demo city',
  description: 'A fictional developer’s repositories as one street, showing every building rule.',
};

/** A city from mock data: works without a GitHub token. */
export default function DemoPage() {
  const snapshot = createDemoSnapshot();

  return (
    <main className="flex flex-1 flex-col">
      <CityHeader title="Demo city" details={`${snapshot.repos.length} buildings · mock data`} />
      <CityPanorama snapshot={snapshot} />
      <RuleLegend />
    </main>
  );
}
