# GitCity

Turn a GitHub profile into a pixel-art Japanese backstreet at night. Every public repository becomes a building: commits make it taller, its language picks the neon, recent pushes light the windows, and forks become little izakaya hung with red paper lanterns.

<!-- Screenshot: add a capture of /demo (for example docs/screenshot.png) and link it here. -->
> **Screenshot placeholder.** Add a capture of the demo city here.

## Features

- **One street per account.** Any GitHub user or organization, built from their 100 most recently pushed public repos.
- **Deterministic.** The same data always builds the same city, seeded from the owner and repo names.
- **Explorable.**
  - Drag to walk the street; scroll, pinch or use the toolbar to zoom.
  - Hover a building for a quick label; click it for details and a link to GitHub.
- **City stats.** Total buildings, the tallest, the most-used language and the oldest repo.
- **Shareable.** Links like `/city/<user>?repo=<name>&rain=1` open with the building selected and the rain falling.
- **PNG export.** Save the whole street as one image.
- **Atmosphere.**
  - Flickering neon, windows switching on and off, a train on the elevated railway, passing taxis and cyclists, steam from a food stall.
  - Optional rain with rippling neon reflections on the wet street.
- **Accessible.**
  - Respects `prefers-reduced-motion` with a still city.
  - Full keyboard controls, and a building directory for keyboard and screen-reader users.
- **Drawn entirely in code.** No image assets: buildings, signs, vehicles and the sky are all generated on a canvas.

## How to read the street

| Repo data | Building |
| --- | --- |
| Commits on the default branch | Height. Floors = 1 + round(4 × log10(1 + commits)), capped at 22, so huge repos don't dwarf the rest |
| Height | Type. Up to 4 floors is a shop, 5–10 a mid-rise 雑居ビル with stacked tenant signs, 11+ a tower |
| Size on disk | Width. Under 0.5 MB narrow, 0.5–5 MB medium, over 5 MB wide |
| Primary language | Neon color. TypeScript cyan, JavaScript amber, Python ice, Rust orange, Ruby pink and so on; other languages are hashed to a hue |
| Last push | Lit windows. About 90% lit when pushed this week, fading toward 10% over a year |
| Stars | Rooftop. 10+ an antenna, 100+ a billboard with the repo's name, 1000+ a red blinking beacon |
| No commits for over a year | Dark facade, boarded shop front, a broken sign that sputters |
| Fork | A wooden izakaya with noren and red paper lanterns, grouped into a 横丁 alley |
| Archived | Shutters down and a 閉店 ("closed") board |

Every threshold lives in [`src/lib/city/rules.ts`](src/lib/city/rules.ts). Signs only ever use real, everyday shop words (ラーメン, 居酒屋, 喫茶, カラオケ, 本屋…).

## Getting started

Requires Node.js 22.12 or newer (24 recommended) and npm.

```bash
npm install
cp .env.example .env.local   # then add your GITHUB_TOKEN
npm run dev
```

Open <http://localhost:3000> and enter a username, or go straight to `/city/<username>`. The `/demo` city uses mock data and works without a token.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_TOKEN` | For real cities | Used only by the server to call GitHub's GraphQL API; it never reaches the browser. A [classic personal access token](https://github.com/settings/tokens) with **no scopes** is enough, since GitCity only reads public data. A fine-grained token with read-only access to public repositories also works. Without a token, city pages explain what's missing and `/demo` still works. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | All of the above, as CI runs them |

## How it works

**Data.**

- The browser asks `GET /api/city/[username]`. That route handler queries GitHub's GraphQL API through `repositoryOwner`, so organizations work too. It pages through the public repos the owner owns, most recently pushed first, and stops at 100.
- Commit counts come from each default branch's history in the same query.
- Results are cached with Next.js's `use cache: remote`: an hour for cities, minutes for unknown usernames, seconds for failures. Successful responses also carry `s-maxage=3600` for the CDN.
- Rate limits are recognised, including the ones GraphQL reports with HTTP 200. They become a friendly "closed for a moment" screen with the reset time.

**Generation.**

- Pure functions turn the snapshot into a city: building rules, then layout.
- Every random choice comes from a stream seeded by the owner and repo names. Each building's look depends only on its own name, so adding a repo doesn't repaint the rest.
- Time-based rules (lit windows, abandonment) are measured from the snapshot's fetch time, not the clock.

**Rendering.**

- Canvas 2D, no game engine. Each frame is drawn at a low internal resolution and scaled up by a whole number with smoothing off, so pixels stay crisp at every zoom level.
- Static art is baked into sprites once per city. Animated touches (flicker, blinking beacons, windows, traffic, rain) are computed from the time on top. Neon glows are pre-blurred and added after the upscale, so they stay soft.
- Layers, back to front: sky, distant skyline, midground and railway, street, buildings, signs, street furniture, effects, weather.
- Japanese lettering comes from the DotGothic16 font, sampled into exact dot matrices so it's crisp and identical in every browser.

```text
src/
  app/              Routes (App Router) and the /api/city route handler
  components/       UI: city view, overlays, loading/empty/error states, landing
  hooks/            Scene building and reduced-motion hooks
  lib/
    snapshot.ts     The data contract between fetching and generation
    api.ts          The /api/city contract shared by server and browser
    github/         GraphQL query, pagination, normalization, errors, caching
    city/           Pure and tested: seeding, building rules, layout, stats
    render/         Canvas renderer: palette, glyphs, sprites, layers, camera,
                    hit testing, animation timing, live renderer, PNG export
    mock/           A fictional developer used by /demo and the tests
```

## Deploying

**Vercel** (recommended):

1. Import the repository.
2. Add `GITHUB_TOKEN` under Project Settings → Environment Variables.
3. Deploy.

No other configuration is needed.

**Any Node.js host:** run `npm run build && npm start`. Without a platform cache handler, the GitHub cache lives in memory per server instance.

## Testing

`npm test` runs the unit tests. They cover:

- the building rules
- seeded generation (same data gives the same city; repo order doesn't matter)
- stats
- the GitHub client, against mocked responses: pagination, rate limits, errors
- username handling
- camera math and hit testing
- animation timing

`npm run check` runs lint, type checks, tests and the build, the same steps as the GitHub Actions workflow.

## Credits

- Sign lettering: [DotGothic16](https://fonts.google.com/specimen/DotGothic16) by Fontworks.
- Headings: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38.

Both fonts are under the SIL Open Font License. Everything else is drawn in code.
