# NutriFact Lab v0.4

Working branch for the evidence-first nutrition / supplement MVP.

## v0.4 additions

- Supplement Label Decoder: separates serving size, per-unit amount and declared active ingredients. It is explicitly not a personal dose calculator.
- Compare tool: Magnesium forms, Vitamin D2 vs D3, EPA vs DHA / fish-oil total.
- Explore by Goal: sleep, exercise, gut, bone health, plant-based diets and immune-related nutrition questions.
- Updated home navigation and tool cards.
- SEO scaffold: metadata, sitemap and robots routes in the full Next.js source.

## Safety / editorial constraints

- Evidence is graded per outcome, not per ingredient as one overall score.
- Human evidence is prioritized over mechanistic, cell and animal findings.
- Label calculations are educational arithmetic only and do not produce a recommended dose.
- No brand ranking or product recommendation is implied.
- High-dose supplementation, medication interactions, pregnancy / breastfeeding and medical conditions require professional assessment.

## Deployment note

The full v0.4 Next.js source is maintained as the development baseline. A static fallback bundle is used when the connected deployment environment cannot install dependencies locally.
