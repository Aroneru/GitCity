import Link from 'next/link';
import { chipClass } from '@/components/ui/styles';

/** Well-known public profiles whose cities show off different shapes of history. */
export const EXAMPLE_LOGINS = ['torvalds', 'gaearon', 'sindresorhus', 'yyx990803'] as const;

export function ExampleCities() {
  return (
    <nav aria-label="Example cities">
      <ul className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_LOGINS.map((login) => (
          <li key={login}>
            <Link href={`/city/${login}`} className={chipClass}>
              @{login}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/demo" className={chipClass}>
            Demo city
          </Link>
        </li>
      </ul>
    </nav>
  );
}
