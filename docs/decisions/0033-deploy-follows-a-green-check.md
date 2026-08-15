# 0033. Deploy is a consequence of a green check, not of a push

- **Date:** 2026-08-15
- **Status:** accepted

## Context

mulch is an entirely client-side bundle — no server, no secrets ([`.env.example`](../../.env.example),
and the note to that effect in `check.yml`). Publishing it is copying `dist/` somewhere static, so
the host that costs nothing extra is GitHub Pages on the repo that already runs the gate, at
`mulch.dylanfisher.com`.

The only real question is what triggers it. `push: main` is the obvious answer and the wrong one:
`check.yml` also runs on that push, so the two race, and a commit that fails the gate still lands
on the live domain — the gate stops being a gate for the one artifact anybody outside this repo
sees.

## Decision

**`deploy.yml` triggers on `workflow_run` of `check`, not on push.** It runs only when the
conclusion is `success` and `head_branch` is `main`, and it checks out `head_sha` — the exact
commit that passed — because `workflow_run` otherwise checks out the default branch's tip, which
by then may be a commit nothing has verified. `workflow_dispatch` is kept as the manual escape
hatch; it takes the branch it is dispatched from.

**The domain is `public/CNAME`, in the repo.** Pages reads it from the published artifact, so the
custom domain is a fact of the build like any other, not a setting in a web UI that no checkout
records. Vite copies `public/` verbatim, so this needs no build config; `base` stays `/` because
the site is served from a domain root, not a project subpath.

**The deploy job installs packages but does not run `./scripts/setup`.** Setup also installs the
pinned Playwright Chromium, which exists for `./scripts/drive` and therefore for `./scripts/check`.
The deploy already knows check passed; a second browser download to build a bundle is pure latency.

## Alternatives considered

- **`on: push: main`, with the gate re-run inside the deploy job** — rejected. It runs the whole
  gate twice per push and makes `check.yml` and `deploy.yml` two places that describe what "green"
  means.
- **`on: push: main` with no gate** — rejected. That is the failure above: broken code on the
  live domain.
- **`peaceiris/actions-gh-pages` and a `gh-pages` branch** — rejected. It needs a write token and
  keeps a branch of build output in the history; `actions/deploy-pages` uses the OIDC id-token and
  an artifact, and leaves no build output in git.
- **A third-party host (Vercel, Netlify, Cloudflare Pages)** — rejected for now. Each is a second
  account and dashboard holding configuration this repo does not, in exchange for features a
  static single-page bundle with no server does not use.

## Consequences

The live site is always a commit that passed `./scripts/check`. Nothing about it can be changed
without a commit — the domain included.

Two one-time settings live outside the repo and cannot be made to: Pages must be set to the
**GitHub Actions** source in repo settings, and `mulch` must exist as a `CNAME` record at
`dylanfisher.com`'s DNS pointing at `dylanfisher.github.io`. The second is the only thing here
that lives in another company's control panel; there is no way around it.

Deploys trail a push by the length of the gate, since they start when it finishes. That is the
price of the guarantee and the run is minutes, not hours.

No `404.html` fallback is published, because `App.tsx` routes on `window.location.hash` — every
route is the one served `index.html`. The day a path-based route exists, that is the file to add:
Pages serves `404.html` for unknown paths, and a copy of `index.html` is the whole fix.
