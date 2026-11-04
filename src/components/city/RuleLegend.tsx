const RULES = [
  { label: 'Height', detail: 'commit count, on a log scale' },
  { label: 'Type', detail: 'shops, then mid-rises, then towers as it grows' },
  { label: 'Width', detail: 'repo size, in three tiers' },
  { label: 'Neon', detail: 'primary language' },
  { label: 'Lit windows', detail: 'how recently it was pushed' },
  { label: 'Rooftop', detail: '10★ antenna · 100★ billboard · 1000★ beacon' },
  { label: 'Dark, broken sign', detail: 'no commits for over a year' },
  { label: 'Izakaya', detail: 'a forked repo' },
  { label: 'Shutters, 閉店', detail: 'an archived repo' },
] as const;

/** How to read the city. */
export function RuleLegend() {
  return (
    <section aria-labelledby="rules-heading" className="px-4 py-8 sm:px-6">
      <h2 id="rules-heading" className="mb-4 font-pixel text-xs text-neon-cyan">
        How to read the street
      </h2>
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {RULES.map((rule) => (
          <div key={rule.label} className="flex gap-2">
            <dt className="font-dot text-neon-amber">{rule.label}</dt>
            <dd className="text-mist">{rule.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
