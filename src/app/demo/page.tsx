import type { Metadata } from 'next';
import { CityExperience } from '@/components/city/CityExperience';
import { CityHeader } from '@/components/city/CityHeader';
import { createDemoSnapshot } from '@/lib/mock/demo';

export const metadata: Metadata = {
  title: 'Demo city',
  description: 'A fictional developer’s repositories as one street, showing every building rule.',
};

/** A city from mock data: works without a GitHub token. */
export default function DemoPage() {
  const snapshot = createDemoSnapshot();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <CityHeader title="Demo city" details={`${snapshot.repos.length} buildings · mock data`} />
      <CityExperience snapshot={snapshot} name="demo" />
    </main>
  );
}
