# SuppLab HK — MVP

> Working brand only. A brand collision check found existing products/sites using `SuppLab`, including a very similar evidence-based supplement site. Do not treat this name as final.

## Live MVP

The deployed MVP is a lightweight static prototype designed to validate positioning, visual direction, information hierarchy and search UX before investing in a full editorial platform.

### Current features
- Traditional Chinese / Hong Kong positioning
- Ingredient search
- 6 seed ingredients: Magnesium, Vitamin D, Omega-3, Creatine, Probiotics, Iron
- Outcome-specific evidence labels
- Safety disclaimer
- Evidence-method section
- Responsive mobile layout

## Product direction

Core principle: **do not turn basic nutrient physiology into exaggerated treatment claims.**

A production ingredient record should include:

```ts
{
  slug,
  name,
  zhName,
  category,
  overview,
  evidence: [{ outcome, level, summary }],
  forms,
  caution,
  sources,
  updated
}
```

Evidence levels used by the prototype:
- strong
- moderate
- limited
- insufficient

These are editorial summaries, not a formal GRADE assessment or clinical guideline.

## Before public launch
1. Choose a collision-free final brand/domain.
2. Add named authors/reviewers and relevant credentials.
3. Define an editorial evidence SOP and update cadence.
4. Add conflicts-of-interest / affiliate policy before monetization.
5. Add content version history and correction workflow.
6. Review Hong Kong-facing health/advertising wording before commercial supplement comparisons.

## Architecture roadmap

The fuller development scaffold prepared for this MVP uses Next.js App Router with reusable ingredient data and dynamic ingredient pages. The static version in this branch is intentionally dependency-free so it can be previewed immediately.
