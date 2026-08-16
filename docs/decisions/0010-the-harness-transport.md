# 0010. The harness transport: drive, the pinned browser, and the vite stdin trap

- **Date:** 2026-08-13
- **Status:** accepted

`./scripts/drive` boots the preview build in headless Chromium (no extra audio flags needed) against a Playwright version pinned exactly to fix the Chromium revision, strips vite's stdin `end` listener so drive alone owns stdin and the server's lifetime, keeps assertions in `scripts/smoke` rather than in drive itself, and uses `performance.now()/1000` as the live clock until M2 swaps in `ctx.currentTime`.
