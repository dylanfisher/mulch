# 0001. React + Vite, with a registry-driven audio layer under enforced tiers

- **Date:** 2026-08-12
- **Status:** accepted

Keep TypeScript strict, React 19, Vite, Vitest on pnpm and Node 26, add Tailwind v4 with shadcn/ui on Base UI, and enforce six dependency tiers (`lib → audio → workers → state → ui/components → ui`) in `scripts/arch` as a step of `./scripts/check` rather than in prose alone — so the tier table exists in both `docs/map.md` and `scripts/arch` and the two change in the same commit. Revisit if mulch ever needs a server; the no-secrets shape of `./scripts/dev` and CI assumes it never will.
