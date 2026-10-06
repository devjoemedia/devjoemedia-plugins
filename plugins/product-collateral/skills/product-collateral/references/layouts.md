# Layout blueprints

Page-by-page plans for each format, plus the type scale and the components in `brand.css`.
The FeelyFeely files in `examples/feelyfeely/` implement every blueprint below. Copy the matching
one as your starting point rather than writing from scratch: the spacing has already been tuned.

## Contents
- Shared rules
- Trifold brochure
- Platform brochure
- Onboarding deck
- Other formats (one-pager, flyer, sell sheet)
- Components cheat-sheet

## Shared rules

- One `<section class="page">` per printed page or slide, with a fixed size in CSS units that matches `@page { size }`. `render.mjs` reads both.
- **Give `.page` a whole-pixel height**, even when `@page` is in mm. 210mm is 793.7px and 297mm is 1122.5px. A fractional height makes the PDF bleed a 1px coloured strip onto the next page. Use `height: 793px` (A4 landscape), `1122px` (A4 portrait) or `810px` (16:9 deck). `render.mjs` warns if a page height is fractional.
- Set `@page { margin: 0 }` and keep the margins inside `.page` as padding. That gives a full-bleed background on covers.
- Every page has an eyebrow (a small uppercase label with a gradient dash), a headline, then one lede sentence. Readers skim in that order, so the headline has to carry the message.
- Alternate surfaces for rhythm: white paper, an off-white `--panel`, and a gradient or dark `--ink` hero. Two dark pages in a row feels heavy, and an all-white run feels like a document.
- Show the product on almost every page: phone frames for mobile screens, browser frames for web screens. If a page has no image, it needs a strong grid of cards instead.
- A footer line on every interior page: product name · document name · page number.
- Avoid mid-page holes. If a page ends with more than ~25% blank, add a real content band such as "what you need", a screenshot pair or a callout. Don't stretch the gaps.

### Type scale (px, at the page sizes below)

| Element | A4 brochure | Trifold panel | 16:9 deck |
|---|---|---|---|
| Cover headline | 40 | 34 | 66–72 |
| Page headline (h2) | 25 | 27 | 42–44 |
| Lede | 10.5 | 10–10.5 | 17–19 |
| Card title | 11.5–13 | 12.5–13 | 19–21 |
| Body / card text | 8.8–9.8 | 9–9.6 | 14–17 |
| Captions / footer | 7.5–8.5 | 8–9 | 12 |

## Trifold brochure

A4 landscape (`@page 297mm × 210mm`; `.page` 297mm × **793px**), with 2 sides of 3 panels each in `grid-template-columns: repeat(3, 1fr)`.
Dashed borders mark the fold lines. Panel padding is ~30px 28px.

**Side A (outside)**
1. **Cover**: a dark `--ink` panel with blurred glows and 2–3 phone frames fanned at the top. Below them: logo, a chip with the positioning line, a two-line headline (second line in `--on-dark-accent`), a lede, a CTA button and platform chips. A gradient footer strip carries the URL and social handle.
2. **Who it's for**: an off-white panel with 4 audience rows (icon, title, one line). Then a "How it works" card with 3 numbered steps on a connector line, a row of listing-type or offer chips, and a tinted "What you need to start" list.
3. **The platform**: a full gradient panel with the core pillars or features as icon rows. Then a real screenshot strip and a translucent note. A white "free / pricing" card goes at the bottom.

**Side B (inside)**
4. **Why us / benefits**: 5–6 benefit rows, a 2×2 payment or integration tile grid, and a dark "secure by design" card at the bottom.
5. **For business / grow**: one gradient hero module, then 4–5 white module cards, each with a badge (e.g. PREMIUM, FREE).
6. **Next step**: a tinted callout, a dark CTA card (URL, email, handle), app store rows, a QR card, an optional "watch the guides" card, and a signature line with the logo.

## Platform brochure

A4 portrait (`@page 210mm × 297mm`; `.page` 210mm × **1122px**), with page padding of 40px 44px 54px. Plan 12–16 pages:

1. **Cover** (dark): logo and "Official platform brochure · YEAR", then eyebrow, a two-line headline and an intro paragraph. Below: pillar chips and a 4-stat row. Use only verifiable counts, e.g. "5 listing types" or "3 platforms", never invented totals. Finish with a large browser frame and an overlapping phone frame.
2. **Overview**: a 3×2 grid of pillar/feature cards, a wide browser screenshot, and two callouts (one dark, one gradient). Add a "works on every device" row if space allows.
3. **How it works**: 6 numbered steps (left column) beside a phone frame of the sign-up screen and a dark "free" callout. Below: "what you need" tiles and a screenshot pair.
4–N. **One page per pillar or major feature**: a headline that states the user benefit, a wide browser frame, then a split of a phone frame plus a 2×2 feature-card grid. Add a tool grid (4×2 cards) for feature-dense areas.
- **Posting / creating**: a 2×2 grid of wizard screenshots with numbered captions, then a "full flow" chip strip and 3 feature cards.
- **Account**: 2 screenshots, 6 feature cards, 1 dark callout.
- **Business tools**: the storefront screenshot, a dark card listing the dashboard sections as chips, plan tiers (4 cards, no prices unless verified), and extras.
- **Promote / teams**: a promoted-placement screenshot, promotion option chips, a roles table.
- **Trust, safety & payments**: 4 trust cards, a 4×2 payment-method grid, a delivery callout, and policy chips.
- **FAQ**: a 2-column Q&A (10–12 questions), with a "prefer to watch?" callout at the bottom.
- **Back cover** (dark, centred): logo, a big CTA headline, a button, 3 fanned phones, then QR cards and contact lines.

## Onboarding deck

16:9 at `1440px × 810px`, with slide padding of 64px 80px. ~20–25 slides. Each slide carries one idea.

1. **Welcome** (dark): logo, an "Onboarding guide" chip, a huge two-line headline, a lede, audience labels, and two phone frames on the right.
2. **What's inside**: a 2×2 numbered table of contents.
3. **About**: one paragraph with **bold** key nouns, then 3 cards (gradient, dark, tint).
4. **Who it's for**: a 2×2 grid of audience cards.
5. **Pillars / core features**: a 3×2 card grid.
6. **Platforms**: 3 device cards and a dark "one account everywhere" band.
7. **Statement slide** (dark): a big claim about trust or reliability, plus 3 chips.
8. **Section divider** (gradient): "PART TWO / Getting started / N simple steps".
9–17. **Step slides** ("STEP k OF N"): left side has a headline and 3 bullets with **bold UI labels**. The right side is a soft-gradient stage with one phone or browser frame. A progress bar of N dashes sits top-right.
18. **Payments / pricing model**: 4 cards with big gradient words.
19. **For business**: 4 cards plus a cropped screenshot band.
20. **Benefits**: 8 check rows in 2 columns.
21. **Requirements**: 4 numbered cards.
22. **Next step** (gradient): headline, then 3 step tiles at the bottom (the last one is white).
23. **Close** (dark): "Ready when you are", app badges, and a QR + contact card.

Vertically centre the body block on content slides (`.body { margin: auto 0 }`). A top-heavy slide with an empty bottom half reads as unfinished.

## Other formats

The same system covers formats people often ask for next:
- **One-pager / sell sheet**: an A4 portrait page with a dark top third (logo, headline, phone) and a 2×3 feature grid. Finish with a strip of 3 benefit stats and a CTA footer band with a QR code.
- **Flyer (A5 / Letter half)**: one headline, one hero screenshot, 3 bullets and a big QR code.
- **Social square (1080×1080)**: use `.page` sized 1080px; headline, one phone, logo. Render to PNG previews only.

## Components cheat-sheet (`brand.css`)

| Class | Use |
|---|---|
| `.on-dark` | Dark page or panel, which recolours headings, paragraphs and eyebrows |
| `.eyebrow` | Uppercase section label with a gradient dash |
| `.grad-text` / `.grad-text-dark` | Accent words on dark / light backgrounds |
| `.card`, `.card-tint`, `.card-dark`, `.card-grad` | The four card surfaces |
| `.ic` (+ `.solid`) and `<i data-i="name">` | Icon chip; names are in `icons.js` |
| `.chip` (`.light`), `.badge` (`.blue`, `.green`, `.soft`), `.btn` (`.white`) | Labels and CTAs |
| `.browser` (`.bar` with 3 `<i>` and a `<span>` URL) | Desktop screenshot frame. Omit `.bar` if the image already has browser chrome |
| `.phone` | Mobile screenshot frame with a notch |
| `.shot` | Plain rounded screenshot |
| `.num` | Gradient step number |
| `.ticks` | Bulleted list with gradient dots |
| `.glow` | Absolutely positioned blurred colour blob for dark covers |
| `.panel` / `[data-qa-region]` | Columns that QA checks one by one for holes and overflow (trifold panels use `.panel`) |
| `.allow-space` (on `.page` or a panel) | Silences the empty-space QA warnings for intentional title or divider slides |
