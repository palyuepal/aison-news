# AIson × Hallmark v2 — isolated integration preflight (2026-11-10)

## Status and boundaries

This branch **prepares** a project-local Hallmark installation for Codex; it does not vendor or execute the third-party skill, does not redesign AIson, and does not change runtime dependencies, HTML, CSS, JavaScript, editorial data, or deploy settings.

- Source: https://github.com/Nutlope/hallmark (MIT; review upstream source before installing).
- AIson repository: `palyuepal/aison-news`, static HTML/CSS/JS with Python build scripts.
- GitHub Pages publication workflow: `.github/workflows/pages.yml` deploys on `main` pushes, not feature branches.
- Existing Vercel Preview project: `aison-news-b2-preview`; `vercel.json` runs `bash tools/build_vercel.sh`.
- Codex project-scoped skill location: `.agents/skills/hallmark/`. This is agent tooling, not a website runtime dependency.
- Vercel project Node setting is 24.x; installation only requires Node 18+ on the *developer/Codex runner*, not on website visitors.
- Current install status: **NOT INSTALLED BY THIS COMMIT**. Run the reviewed installer in a feature-branch checkout.

## Installation and verification in Codex

1. Clone or open this repository and check out `feature/hallmark-codex-preview-20261110`.
2. Review `tools/setup_hallmark.sh`, the upstream `SKILL.md` and relevant upstream scripts. Hallmark runs external code; treat updates as untrusted until reviewed.
3. Run: `bash tools/setup_hallmark.sh`.
4. Verify `.agents/skills/hallmark/SKILL.md`, `references/`, and `scripts/` are present, and that Codex lists `hallmark`.
5. Start with **audit only**: `$hallmark audit ./index.html` (or ask Codex: “Use Hallmark to audit the AIson homepage; report only, do not modify files”).
6. Review results and screenshots. Render checks need Chrome and `puppeteer-core`; otherwise label them “not run”.
7. Do not commit the generated skill payload or modify site files unless a later change is specifically approved. Keep separate changes in a branch and Preview.

If the CLI flags change, use the upstream documented `npx skills add Nutlope/hallmark` interactively in the checkout (without `-g`) and select Codex; never silently fall back to a global installation.

## AIson design and functionality to preserve

- Editorial identity: AIson name and mascot; existing navy/yellow identity, Chinese (Hong Kong) copy and hierarchy.
- Homepage `index.html`, `styles.css`, `theme.css`, `visual-system-v2.css`, `home-foundation-v6.css`, `home-v6.css`, `homepage-editorial.css`: do **not** auto-overwrite.
- News feeds, daily Top 10/rankings, LIVE, search/filter, navigation, article/archive pages and share functions.
- Existing element IDs and dataset hooks used by `app.js`, `home-v6.js`, `analytics.js` and related scripts.
- Light/dark contrast, mobile nav, touch targets, reduced-motion accessibility.
- SEO metadata, canonical, sitemap, robots, structured data, social sharing, PWA/service worker.
- Beehiiv subscribe form, outbound links and existing analytics events.
- No invented AI news, quotations, traffic numbers, metrics, or site testimonials.

## Safe preview acceptance checklist

- Preview uses a Vercel deployment with **target=preview** and Git source from this feature branch; never promote or assign a production domain.
- Distinguish an integration Preview (unchanged visual site) from a later Hallmark redesign Preview.
- Compare homepage on mobile/desktop in both light/dark modes; check search, categories, LIVE, daily/archive, article navigation and subscription.
- Test the current Python validation/build pipeline when possible; report actual results, not assumed passes.
- An audit is read-only. Any design revisions require separate scope, controlled diffs and no changes to existing content or wiring.
- Explicitly mark checks as verified, untested or blocked; no automatic merge.

## Risk register

1. **Upstream install supply-chain risk:** `npx` downloads and executes third-party code. Review and optionally pin an audited revision before production team use.
2. **Design regression risk:** Hallmark can impose styling rules that conflict with the existing multi-layer CSS. Audit first, never mass-replace styles.
3. **Publishing risk:** Main branch runs the GitHub Pages workflow and Vercel also has production deployments. Keep changes strictly to the feature branch, Preview target, and a draft PR.

Rollback: close the draft PR and delete this feature branch. No production assets or settings are altered by this preparation.
