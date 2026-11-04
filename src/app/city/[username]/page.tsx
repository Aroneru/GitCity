import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CityLoading } from '@/components/city/CityStates';
import { CityView } from '@/components/city/CityView';

export async function generateMetadata({ params }: PageProps<'/city/[username]'>): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `@${username}'s public GitHub repositories, rebuilt as a pixel-art street at night.`,
  };
}

/**
 * The shareable city page. Its shell (and loading state) is prerendered;
 * the username resolves at request time and the city loads from the API.
 */
export default function CityPage({ params }: PageProps<'/city/[username]'>) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<CityLoading />}>
        {params.then(({ username }) => (
          <CityView key={username} username={username} />
        ))}
      </Suspense>
    </main>
  );
}
