# GitCity

Turn a GitHub profile into a pixel-art Japanese backstreet at night. Each public repo becomes a building: commits make it taller, its language picks the neon, recent pushes light the windows, and forks turn into little izakaya.

> **Status:** work in progress. A city generated from mock data is live at `/demo`; real GitHub data, interactivity and animation follow.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000/demo.

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

```
src/
  app/              Next.js routes (App Router)
  components/       UI components
  lib/
    snapshot.ts     The data contract between fetching and generation
    city/           Pure, tested: seeding, building rules, layout, stats
    render/         Canvas renderer: palette, glyphs, sprites, layers, scene
    mock/           A fictional developer used by /demo and the tests
```

The city pipeline is pure and deterministic: the same snapshot always produces the same layout. Every random choice comes from a stream seeded by the owner and repo names. The renderer draws at a low internal resolution and upscales by whole pixels, so the art stays crisp.

## Credits

Sign lettering uses [DotGothic16](https://fonts.google.com/specimen/DotGothic16) by Fontworks, under the SIL Open Font License. Headings use [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, also under the SIL Open Font License. All artwork is drawn in code.
