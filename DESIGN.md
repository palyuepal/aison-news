# AIson Design System — DESIGN.md
Status: Preview proposal v0.1. Applies only to the isolated homepage design branch. Not a production instruction.

## Purpose
AIson is a Traditional Chinese (Hong Kong) AI-news publication. Optimize clarity, trust, readability, speed and recognizable editorial hierarchy, not imitation of another brand.

## References
- The Verge: strong editorial headline hierarchy, differentiated feature story and secondary news.
- Spotify: structured dark surfaces and scannable content grouping.
Use principles only. Do not copy logos, imagery, proprietary layouts or brand identities.

## Brand identity
Preserve AIson's gray-white poodle mascot, round yellow glasses, navy hoodie, Hong Kong positioning, and the AIson name.
Palette based on existing code:
- Navy: #071A33
- Blue: #0F3D73
- Gold: #F6C547
- Paper: #F5F7FB
- White: #FFFFFF
- Ink: #0B2345
These are baseline tokens, not permission to override existing dark-mode semantic colors.

## Typography and layout
Use readable Traditional Chinese system sans-serif for body and interface; editorial serif is optional for major headings only, with robust Traditional Chinese fallbacks.
Desktop: one lead story with clear secondary ranking. Mobile: single column, no horizontal overflow.
Keep LIVE chronology, publication timestamps, sources, corrections and AIson Take visible and correctly labeled.

## Accessibility and performance
Target WCAG AA contrast, visible focus, keyboard navigation, >=44px touch targets, reduced motion, stable image dimensions and readable text at 320px width.
Preserve existing dark/light mode and theme persistence.

## Engineering constraints
Existing homepage currently loads styles.css, engagement.css, visual-system-v2.css, home-foundation-v6.css, home-v6.css, homepage-editorial.css, theme.css and reader-ui.css. Some overrides use !important. Do not append global overrides without checking specificity, cascade order, dark mode and responsive states.
Do not alter main, production deployment, content archives, daily publishing, LIVE jobs, analytics, RSS, SEO metadata, canonical URLs, structured data, search or sharing.
Do not change CSS source order without regression testing.

## Preview acceptance checklist
1. Baseline screenshots: desktop 1440px; mobile 390px and 320px.
2. Homepage hero, #1 story, secondary stories, LIVE panel, header and footer.
3. Light/dark mode, navigation, search, links, keyboard focus.
4. No horizontal scroll, clipping or unreadable content.
5. Compare generated HTML and functional behavior with main.
6. Present preview URL and evidence for explicit user approval; never merge or deploy to production automatically.

## Initial CSS audit (2026-11-15)
The following counts are raw text occurrences, not verified CSS defects:
| File | Bytes | !important | @media |
|---|---:|---:|---:|
| styles.css | 89727 | 215 | 20 |
| visual-system-v2.css | 23206 | 28 | 3 |
| home-foundation-v6.css | 37686 | 35 | 11 |
| home-v6.css | 56934 | 129 | 15 |
| homepage-editorial.css | 25500 | 113 | 4 |
| theme.css | 8750 | 49 | 2 |
| reader-ui.css | 8530 | 55 | 4 |
The homepage also has 13 !important occurrences in index.html. Further browser visual regression and dependency checks are required.
