# GitCity

Turn a GitHub profile into a pixel-art Japanese backstreet at night. Each public repo becomes a building: commits make it taller, its language picks the neon, recent pushes light the windows, and forks turn into little izakaya.

> **Status:** work in progress. Cities are generated from real GitHub data and fully explorable: drag, zoom, hover, click for details, share, and save as PNG. Animation and weather follow.

## Quick start

```bash
npm install
cp .env.example .env.local   # then add your GITHUB_TOKEN
npm run dev
```

Open <http://localhost:3000> and enter a username, or visit `/city/<username>` directly. `/demo` works without a token.

A classic [personal access token](https://github.com/settings/tokens) with **no scopes** is enough: the app only reads public data. The token stays on the server; the browser only ever talks to `/api/city/[username]`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | All of the above |

## How the code is organised

```text
src/
  app/              Next.js routes (App Router) and the /api/city route handler
  components/       UI components (city view, overlays, states)
  hooks/            Scene building and reduced-motion hooks
  lib/
    snapshot.ts     The data contract between fetching and generation
    api.ts          The /api/city contract shared by server and browser
    github/         GraphQL query, pagination, normalization, errors, 1h cache
    city/           Pure, tested: seeding, building rules, layout, stats
    render/         Canvas renderer: palette, glyphs, sprites, layers, scene,
                    camera, hit testing, live renderer, PNG panorama
    mock/           A fictional developer used by /demo and the tests
```

The city pipeline is pure and deterministic: the same snapshot always produces the same layout. Every random choice comes from a stream seeded by the owner and repo names. The renderer draws at a low internal resolution and upscales by whole pixels, so the art stays crisp.

## Credits

Sign lettering uses [DotGothic16](https://fonts.google.com/specimen/DotGothic16) by Fontworks, under the SIL Open Font License. Headings use [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, also under the SIL Open Font License. All artwork is drawn in code.
