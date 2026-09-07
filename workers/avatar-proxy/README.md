# Avatar proxy

A Cloudflare Worker that re-serves Codeforces user pictures so a card can
display them.

## Why it exists

Codeforces refuses its userpic images to requests carrying a foreign referer.
A card on any other origin therefore gets nothing, and a public image cache
such as wsrv.nl is refused for the same reason — it fetches server-side and is
equally foreign. This Worker asks with `Referer: https://codeforces.com/` and
returns the bytes with `Access-Control-Allow-Origin: *`, which is all a browser
needs.

Nothing else changes: the card still tries Codeforces directly first, and falls
back to initials if both fail. Without the Worker configured, the site behaves
exactly as it did before.

## Deploy

You need a free Cloudflare account. From this directory:

```sh
npx wrangler login
npx wrangler deploy
```

Wrangler prints the URL it deployed to, e.g.
`https://cf-cards-avatar.<your-subdomain>.workers.dev`.

## Point the site at it

In the GitHub repository: **Settings → Secrets and variables → Actions →
Variables → New repository variable**.

- Name: `AVATAR_PROXY`
- Value: the Worker URL, with no trailing slash

Push anything to `main` (or re-run the deploy workflow) and cards will use it.
Leave the variable unset and the site falls back to wsrv.nl, as before.

## Check it works

Open the Worker URL with a real picture:

```
https://cf-cards-avatar.<subdomain>.workers.dev/?url=https://userpic.codeforces.org/<...>.jpg
```

An image means it works. `502` means Codeforces refused the Worker too; `403`
means the URL isn't a Codeforces host.

## Scope

Only `codeforces.com` and `codeforces.org` over HTTPS are proxied, and only
image responses are returned — otherwise this would be an open proxy anyone
could point anywhere at your account's expense.
