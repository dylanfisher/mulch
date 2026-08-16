# 0033. Deploy is a consequence of a green check, not of a push

- **Date:** 2026-08-15
- **Status:** accepted

`deploy.yml` triggers on `workflow_run` of `check` succeeding on `main`, checks out that run's exact `head_sha` to GitHub Pages, and the custom domain lives in `public/CNAME` in the repo rather than in dashboard config; the only two facts that cannot live in the repo are Pages' source being set to **GitHub Actions** and the `mulch` `CNAME` record at `dylanfisher.com` pointing at `dylanfisher.github.io`.
