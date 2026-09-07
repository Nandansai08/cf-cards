# Security Policy

## Supported versions

This project is a single deployed web app. Only the latest commit on `main` and
the live deployment are supported — fixes go to `main` and are redeployed
rather than backported.

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub:

1. Go to <https://github.com/Nandansai08/cf-cards/security/advisories/new>
2. Describe the issue, the impact, and the steps to reproduce it

You should get an initial response within a few days. Once a fix is out we're
happy to credit you in the advisory — say so in your report if you'd like that.

## Scope

Things worth reporting:

- Cross-site scripting or HTML injection, particularly anywhere a Codeforces
  handle, contest name, problem tag or organization string is rendered — that
  content comes from an external API and is attacker-influenceable
- Abuse of the avatar proxy at `/api/public/avatar`: server-side request
  forgery, requests reaching hosts outside the Codeforces allow-list, or using
  it as an open proxy
- Anything that lets one visitor read or tamper with another visitor's data
- Dependency vulnerabilities that are actually reachable from this app's code

Out of scope:

- Vulnerabilities in codeforces.com itself — report those to Codeforces
- Rate limiting of the public Codeforces API, or the app being slow when
  Codeforces is slow
- Missing security headers with no demonstrated impact
- Automated scanner output with no working proof of concept

## Notes for reporters

This app has no user accounts, no database, no server-side sessions and no
secrets. Everything it stores lives in the visitor's own `localStorage`
(cached Codeforces responses and locally generated cards), and everything it
reads comes from the public Codeforces API. The only server-side code is the
avatar proxy in `src/routes/api/public/avatar.ts`, which is restricted to a
fixed allow-list of Codeforces hosts — that route is the most interesting place
to look.

If you find a hardcoded credential anywhere in this repository, that is a bug
worth reporting regardless of exploitability: there should never be one.
