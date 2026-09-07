## What does this change?

<!-- One or two sentences. If it closes an issue, write "Closes #123". -->

## Why?

<!-- What problem does this solve? -->

## Screenshots

<!--
Required for anything that changes the UI. Please include a mobile width too —
the card has to look right on a phone.
-->

## Checks

- [ ] `npm run lint` reports zero errors
- [ ] `npx tsc --noEmit` is clean
- [ ] `npm run build` succeeds
- [ ] I tested with at least one real Codeforces handle

## If this touches the rating model (`src/lib/fut.ts`)

- [ ] The calculation is still fully deterministic — same handle, same card
- [ ] I updated the matching explanation on `/about` and in `ATTR_META`
- [ ] I noted below how a few real handles move as a result

<!-- e.g. tourist 92 -> 93, SecondThread 90 -> 90, a 1200-rated account 47 -> 45 -->
