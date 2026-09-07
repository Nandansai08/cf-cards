# Codeforces Cards

Turn any Codeforces handle into a collectible, Ultimate-Team-style player card:
an overall rating (OVR), six attributes, a rarity tier, playstyle badges,
achievements and full rating history — all computed from public Codeforces data.

**Nothing is random.** Every number on a card is a deterministic function of the
handle's public Codeforces history, so the same handle always produces the same
card. The full methodology is documented in-app on `/about`.

## Features

| Route | What it does |
| --- | --- |
| `/` | Landing page — handle search, example cards, rating methodology, rarity tiers |
| `/generate` | Enter a handle and generate a card |
| `/player/$handle` | Full public profile: card, key stats, attributes, rating chart, form, analysis, achievements, evolution |
| `/compare` | Two handles side by side, attribute-by-attribute, with a neutral summary |
| `/leaderboard` | Ranked tables by OVR, rating, solved, potential, fastest rising, most contests — global, country or organization |
| `/squad` | Build a five-player lineup with a squad OVR and synergy score |
| `/pack` | Pack-opening reveal: rarity to OVR to card |

Cards can be flipped, restyled (frame, background, tier theme — visuals only,
never the stats) and exported as PNG in front / back / both / story formats.

## The rating model

Six attributes, each scaled 1-99 and derived from public data:

| Attribute | Meaning | Weight in OVR |
| --- | --- | --- |
| `PAS` | Contest performance and consistency | 30% |
| `SHO` | High-rated problem solving | 22% |
| `DEF` | Difficult-problem performance | 15% |
| `DRI` | Versatility across tags and difficulty | 13% |
| `PHY` | Endurance and consistency over time | 12% |
| `PAC` | Improvement speed / rating growth | 8% |

Volume-based inputs (problems solved, contests played, tags, active months) are
log-scaled so that huge problem counts add diminishing value instead of
dominating the card — difficulty and contest results carry the most weight.
Potential adds a bounded bonus (max +12) from recent trajectory; it is an
estimate for fun, not a prediction.

OVR is a Codeforces Cards metric. It is **not** an official Codeforces rating.

## Data

All data comes from the public Codeforces API — `user.info`, `user.rating` and
`user.status`. No login, no private data, no API keys. Requests are serialized
with a small gap to respect Codeforces rate limits and cached in the browser for
30 minutes. Country and organization are shown only when Codeforces publishes
them; nothing is fabricated.

Codeforces serves user avatars without CORS headers, which breaks canvas-based
PNG export, so avatars are proxied through `/api/public/avatar` (that route
allow-lists Codeforces hosts only).

## Tech stack

- [TanStack Start](https://tanstack.com/start) (file-based routing, SSR) + TanStack Router / Query
- React 19 + TypeScript
- Tailwind CSS v4 with an oklch semantic token system
- shadcn/ui (new-york) + Radix primitives
- Recharts for the rating history chart, `html-to-image` for PNG export

## Development

Requires Node.js 20+.

```sh
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
```

Routes live in `src/routes/` (file-based — `routeTree.gen.ts` is generated, do
not edit it by hand). The rating engine is `src/lib/fut.ts`, the Codeforces
client is `src/lib/codeforces.ts`, and the card components are in
`src/components/fut/`.

## Notes

Unofficial fan project. Not affiliated with Codeforces or with any football-game
publisher. The card design is original and inspired by collectible sports cards.
