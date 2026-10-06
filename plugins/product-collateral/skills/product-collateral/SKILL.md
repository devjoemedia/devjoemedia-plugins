---
name: product-collateral
description: Turn the product in the current codebase into print-ready marketing collateral (trifold brochure, multi-page platform brochure, onboarding or sales deck, one-pager, flyer) as polished PDFs. It reads the repo's own theme, logo, fonts and copy, and captures real screenshots of the live or local app. Use this whenever someone wants a brochure, trifold, leaflet, sell sheet, one-pager, product or onboarding deck, "marketing materials", "print collateral", or "something like this sample PDF but for our product", even if they don't name a format, and especially when they supply an example brochure or deck to match.
---

# Product collateral

Make print-ready brochures and decks that look like the product they describe: its colours, its logo, its real screens and its real claims. The output is HTML laid out on fixed-size pages and rendered to PDF with headless Chromium. That gives full design control, vector text and a file any print shop accepts.

`<skill-dir>` below is the directory containing this file.

## Workflow

### 1. Scope the job (2 minutes)

Work out from the request, without asking unless it's genuinely ambiguous:
- **Formats.** Default to the three-piece set: trifold, platform brochure and onboarding deck. A request for "a brochure" alone means the platform brochure.
- **Reference samples.** If the user gave sample PDFs or images, look at every page. Render PDF pages to PNG with PyMuPDF (`pymupdf`) or `pdftoppm` if either is available, otherwise read the PDF directly. Note the section order, density and tone. Match their structure and polish, not their brand.
- **Audience.** Customers (benefits, how to start), partners or investors (scale, model), or new users (onboarding steps).

### 2. Set up a work directory

```bash
bash <skill-dir>/scripts/setup.sh collateral      # creates collateral/{src,assets/{shots,img,brand},out}, installs playwright + qrcode
cd collateral
```
Run every script from inside this directory. They resolve `playwright` from the current folder.

### 3. Extract the brand and the facts

These two can run in parallel. Delegate the fact sweep to a subagent if available, because it reads many files.
- **Brand**: read `references/brand-extraction.md`, then fill the `:root` tokens in `src/brand.css`. Build the logo variants:
  `node <skill-dir>/scripts/image-tools.mjs logo <path/to/logo.svg|png> assets/brand`. Then open `assets/brand/logo-proof.png` to check that both variants read on light and dark.
- **Facts**: read `references/content-rules.md` and write `fact-sheet.md` with a source for every line. This is what keeps the piece honest: copy comes from here, not from imagination.

### 4. Capture real screens

Read `references/capture.md`. Then shoot sequentially, never in parallel bursts:
```bash
node <skill-dir>/scripts/shoot.mjs --base https://product.com --text \
  "home-d|d|/" "home-m|m|/" "home-full|df|/" "pricing-d|d|/pricing" "item-m|m|/items/123"
```
Prepare the images with `image-tools.mjs crop | trim | frame | qr` into `assets/img/`. To check what you captured, view downscaled copies before choosing crops.

### 5. Lay out the pages

Read `references/layouts.md` for the blueprint of each format. Then copy the matching worked example from `examples/feelyfeely/` (`trifold.html`, `platform-brochure.html`, `onboarding-deck.html`) into `src/`, and rewrite it for this product:
- Replace every line of copy using the fact sheet. Any sentence that is still about FeelyFeely is a bug.
- Point every `<img>` at your own `assets/img/` and `assets/brand/` files.
- Change the Google Fonts `family=` to the brand font, and swap the example's literal glow and tint colours for the new palette.
- Keep the structure and spacing, but add, remove or reorder pages and sections to fit what this product actually has. A product without payments shouldn't have a payments page.

The examples link `brand.css` and `icons.js` from the same folder. Icons are `<i data-i="name"></i>`, and the names are listed in `icons.js`. Add a path there if you need a new one.

### 6. Render and review

```bash
node <skill-dir>/scripts/render.mjs src/platform-brochure.html out/<Product>-Platform-Brochure.pdf
```
This writes the PDF, per-page PNGs and `out/preview/<pdf-name>/sheet.png`. It also prints QA warnings, checking each page and each trifold `.panel` for: broken images, an unloaded font, fractional page heights, overflow, empty holes and unused bottoms. The checks are heuristics, so a clean run doesn't replace looking. Then:
1. Look at the contact sheet for rhythm and balance, then open individual pages at full size to read the text. Rendering isn't the finish line; looking is.
2. Fix every warning (or mark an intentional title slide `.allow-space`), and anything else that looks off. Common fixes: rebalance a sparse page by adding a real content band; cap a tall screenshot with `height` + `object-fit: cover`; remove a duplicate browser bar; shorten copy that wraps badly.
3. Re-render until the sheet looks like a finished, professional piece, comparable to the reference samples.

### 7. Deliver

- Final PDFs in `out/`, with clear names: `<Product>-Trifold-Brochure.pdf`, `<Product>-Platform-Brochure-<year>.pdf`, `<Product>-Onboarding-Deck.pdf`.
- A short `README.md` in the work directory with the re-render commands, so the team can edit the copy and rebuild.
- Send the PDFs to the user if a file-sending tool exists. Then reply with a table of what was made (format, pages, sections), how the content and imagery were sourced, and the **gap report** from `references/content-rules.md`. That's everything they must confirm before printing.

## Restricted environments (e.g. claude.ai)

Sandboxes may block outbound sites or package downloads. Adapt rather than stop:
- **No codebase attached:** ask for the product URL, logo file, brand colours and a few facts, or for an export of the repo's theme/config files. Then build the fact sheet from what was provided and from the user's answers.
- **Live site unreachable:** ask the user to upload screenshots (desktop and phone) and any demo video. Crop them with `image-tools.mjs`.
- **`npm i playwright` or the Chromium download fails:** check for a preinstalled Chromium or Playwright (`pip show playwright`, `which chromium`). Python Playwright can run the same page logic. If no headless browser is available at all, deliver the HTML files with print CSS plus instructions to "Print → Save as PDF" in Chrome with margins *None* and *Background graphics* on, and say clearly that you couldn't render or review them yourself.
- **No Google Fonts access:** fall back to a local font with similar metrics and mention it in the gap report.

## Why this approach

- **Real screens and real copy** make collateral credible, and they keep a printed claim from being wrong on day one.
- **HTML → PDF** gives exact typography and layout control with tools available everywhere. The same files give pixel previews for self-review, so you can iterate the way a designer would.
- **One shared design system** (`brand.css`) keeps all the pieces consistent with each other, and a rebrand becomes a token change.

## Files

- `scripts/setup.sh`: work-directory scaffold and dependencies.
- `scripts/shoot.mjs`: sequential desktop/mobile screenshots, plus page text.
- `scripts/image-tools.mjs`: `crop`, `trim`, `logo` (transparent + on-dark variants), `qr`, `frame` (from video via ffmpeg).
- `scripts/render.mjs`: PDF, page previews, contact sheet and layout QA.
- `assets/templates/brand.css`, `icons.js`: the print design system.
- `examples/feelyfeely/`: a complete worked set (trifold, 15-page brochure, 23-slide deck) for a Ghanaian marketplace, plus that brand's `brand.css` values. `preview/*-sheet.png` shows the rendered result, which is the quality bar to match. Look at it before laying out your own pages.
- `references/`: `layouts.md` (blueprints, type scale, components), `brand-extraction.md`, `content-rules.md`, `capture.md`.
