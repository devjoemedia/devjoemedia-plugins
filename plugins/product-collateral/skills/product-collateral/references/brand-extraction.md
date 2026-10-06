# Pulling the brand out of a codebase

The collateral has to look like the product, so take every token from the product itself.
Spend ~10 minutes here. It decides whether the result feels on-brand or generic.

## Where to look

| What | Typical locations |
|---|---|
| Colours | `tailwind.config.*` (`theme.extend.colors`), global CSS `:root { --primary: … }` (shadcn uses HSL triplets), `theme.ts` / `colors.ts`, MUI/Chakra theme files, `app.json` / `manifest.json` `theme_color` |
| Real usage | Count utility classes to see what the UI actually uses: `grep -rhoE "\b(bg|text|border)-(blue|indigo|red|…)-[0-9]{3}\b" src \| sort \| uniq -c \| sort -rn \| head`. The most-used accent is the brand colour even when the config is generic |
| Logo | `public/`, `assets/brand`, `static/`, `src/assets`. Look for `logo*`, `*wordmark*`, `*lockup*`, then `favicon`/`icon-512` for the mark. Prefer a PNG/SVG of the full lockup |
| Font | `next/font` imports in the root layout, `@font-face` in CSS, `fontFamily` in tailwind config, Google Fonts `<link>` tags |
| Product name, taglines | Root layout metadata / SEO constants, `manifest.json`, hero components, onboarding screens, the footer |

## Mapping to the template tokens

Fill the `:root` block of `src/brand.css`:

- `--brand`: the primary button/link colour (e.g. tailwind `blue-600`).
- `--brand-strong`: the next shade darker.
- `--brand-ink`: the wordmark colour, or the darkest brand shade used for headings.
- `--accent`: the second colour in the logo, or the secondary brand colour. If the brand has only one colour, use a neighbouring hue of the same saturation so the gradient still has life.
- `--grad`: `135deg`, from `--brand`'s saturated shade to `--accent`. If the logo has a gradient, copy its stops.
- `--ink`: a near-black tinted with the brand hue (e.g. `#0d1530` for blue, `#1a0b0b` for red). Pure black looks off-brand on covers.
- `--on-dark-accent`: a light, readable tint of `--brand` for highlighted words on dark covers.
- `--tint`, `--tint-2`, `--grad-soft`: the 50/100 shades of the brand hue.
- `--on-dark-eyebrow`, `--on-dark-text`, `--on-color-text`: light tints of the brand hue for labels and body text on dark and gradient surfaces. For a warm brand (yellow, red), tint these warm too, or the dark pages will look cold.
- `--shadow-rgb`: the r,g,b of `--ink`, used for drop shadows.
- `--font-features`: `"cv11", "ss01"` suits Inter only. Use `normal` for any other font.
- `--font`: the product's UI font. Load it from Google Fonts in each HTML `<head>`. Change the `family=` in the link too.

The example HTML files also contain a few literal colours (glow blobs such as `#3150ff`, and light tints such as `#a5b8ff` and `#dfe4ff` on dark or gradient panels). Swap those for hues from the new palette when adapting an example.

## Traps seen in real projects

- **Placeholder font files.** A repo can ship 0-byte `.woff2` files, with the real font served by `next/font` at build time. Check the file sizes. If they're empty, load the font from Google Fonts instead of referencing local files.
- **Fake marks.** `icon.svg` or `ff-icon.svg` is sometimes a generated placeholder (initials on a square), not the real mark. Open it before using it. The real lockup is usually a PNG in a `brand` folder.
- **Logo on dark backgrounds.** Most repos only have the logo for light backgrounds. `image-tools.mjs logo <svg|png|jpg> assets/brand` handles this:
  - It removes any flat background (white or off-white JPEG grey).
  - It finds the wordmark's ink colour and turns only that ink white, so a coloured mark or accent (a gradient icon, a green tick) keeps its colours.
  - It splits out `mark.png` only when the left part really is a separately coloured mark.

  Always open `logo-proof.png`, which shows both variants on light and dark. If the repo has a clean SVG, a tidy alternative is to copy it and swap the wordmark's `fill` for white.
- **Generic config, branded usage.** shadcn defaults (`--primary: 222 47% 11%`) often aren't the real brand. Trust the class-usage counts and the logo over an untouched default config.
