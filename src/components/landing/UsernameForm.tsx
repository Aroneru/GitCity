'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cleanUsername, isValidUsername } from '@/lib/username';

export function UsernameForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const login = cleanUsername(value);
    if (!isValidUsername(login)) {
      setError(login ? 'Use letters, numbers and hyphens, up to 39 characters.' : 'Type a GitHub username first.');
      return;
    }
    router.push(`/city/${login}`);
  };

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-2">
      <label htmlFor="username" className="text-left font-dot text-sm text-mist">
        GitHub username
      </label>
      <div className="flex border-2 border-night-600 bg-night-900 focus-within:border-neon-cyan">
        <span aria-hidden className="py-3 pl-3 font-dot text-lg text-mist">
          @
        </span>
        <input
          id="username"
          name="username"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="octocat"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'username-error' : undefined}
          className="min-w-0 flex-1 bg-transparent px-1 py-3 font-dot text-lg text-paper outline-none placeholder:text-mist/60"
        />
        <button
          type="submit"
          className="bg-neon-amber px-4 font-pixel text-xs text-night-950 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan motion-reduce:transition-none"
        >
          Build
        </button>
      </div>
      {error && (
        <p id="username-error" role="alert" className="text-left text-sm text-neon-red">
          {error}
        </p>
      )}
    </form>
  );
}
