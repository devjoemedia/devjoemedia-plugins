# product-collateral: developer guide

Turn any product's codebase into print-ready PDFs: a trifold brochure, a multi-page platform brochure, an onboarding deck, a one-pager. The skill reads the product's own brand, copy and screens, so you don't design anything by hand.

## 1. Before you start

| You need | Notes |
|---|---|
| Claude Code | CLI, desktop app or IDE extension |
| Node.js 18+ | `node -v` to check |
| Internet access | For first-run installs (Playwright + Chromium, ~150 MB), Google Fonts and screenshots of the live site |
| *Optional* ffmpeg | Only if you want frames from demo or how-to videos (`brew install ffmpeg`) |

## 2. Install (once per machine)

Inside Claude Code:

```
/plugin marketplace add devjoemedia/devjoemedia-plugins
/plugin install product-collateral@devjoemedia-plugins
```

Or from a terminal:

```bash
claude plugin marketplace add devjoemedia/devjoemedia-plugins
claude plugin install product-collateral@devjoemedia-plugins
```

Start a **new** Claude Code session afterwards so the skill loads. Check it's there with `/plugin`; it should be listed and enabled.

## 3. Make collateral

1. **Open Claude Code in the product's repo** (the folder with its `package.json`, tailwind config, `public/` and so on).
2. **Ask for what you want.** Plain language is fine:
   - "Make a trifold brochure for this app, clean like a professional print piece."
   - "Create a platform brochure and an onboarding deck. Match the style of ~/Downloads/sample-brochure.pdf."
   - "We need a one-page sell sheet for the vehicles feature."

   If the skill doesn't kick in, invoke it directly: `/product-collateral:product-collateral make a trifold`.
3. **Help it with three things** in the same message, if you can:
   - **The live URL** (e.g. `https://app.example.com`), or tell it to use your local dev server. Real screenshots make the biggest difference.
   - **A sample PDF** to match, if you have one.
   - **Where to work**: by default it creates a `collateral/` folder in the current directory. Say "use ~/Desktop/acme-collateral" to keep it out of your repo, or add `collateral/` to `.gitignore`.
4. **Approve the steps it asks about**: installing Playwright, taking screenshots, writing files. It takes screenshots one page at a time, so it won't hammer your API.
5. **Wait.** A trifold takes about 10 minutes; a full three-piece set takes longer. Here's what it does:
   1. Pulls colours, logo and font from the code.
   2. Writes a sourced `fact-sheet.md`.
   3. Captures desktop and mobile screens.
   4. Lays out the pages from tested blueprints.
   5. Renders the PDFs and reviews its own previews, fixing layout problems until the checks pass.

## 4. Review what you get

```
collateral/
├── out/<Product>-Trifold-Brochure.pdf        ← the deliverables
├── out/preview/<name>/sheet.png              ← one-glance contact sheet
├── fact-sheet.md                             ← every claim, with its source file/URL
├── src/*.html, src/brand.css                 ← editable source
└── assets/                                   ← screenshots, crops, logo variants
```

Then:

1. **Read the gap report** at the end of Claude's reply. It lists everything to confirm before printing: missing phone numbers, contradictions found in the code (e.g. two support emails), inferred claims, and features left out on purpose.
2. **Check `fact-sheet.md`** against what marketing actually wants to say.
3. **Ask for changes in plain language**: "Swap the cover phone for the checkout screen", "Add our WhatsApp +233 …", "Drop the auctions card". Claude edits the HTML and re-renders.

## 5. Edit it yourself (optional)

Copy lives in `collateral/src/*.html`, and the brand colours sit at the top of `collateral/src/brand.css`. After editing, re-render. The easiest way is to ask Claude to re-render. Or run it yourself from inside `collateral/`:

```bash
SK=$(ls -d ~/.claude/plugins/cache/devjoemedia-plugins/product-collateral/*/skills/product-collateral | tail -1)
node "$SK/scripts/render.mjs" src/trifold.html out/Acme-Trifold-Brochure.pdf
```

Read the `QA warnings` it prints (empty holes, overflow, broken images, a missing font), then look at `out/preview/<name>/sheet.png`.

## 6. Print

The PDFs are A4 (trifold: A4 landscape, folds at the dashed lines) with full-bleed backgrounds. Most print shops accept them as-is. If yours needs bleed and crop marks, ask Claude to "add 3mm bleed and crop marks".

## 7. Keep it updated

```bash
claude plugin marketplace update devjoemedia-plugins
```

## Roll it out to a team

Commit this to a project's `.claude/settings.json`. Teammates are prompted to install it when they open the project:

```json
{
  "extraKnownMarketplaces": {
    "devjoemedia-plugins": { "source": { "source": "github", "repo": "devjoemedia/devjoemedia-plugins" } }
  },
  "enabledPlugins": { "product-collateral@devjoemedia-plugins": true }
}
```

## Using claude.ai instead

Download `product-collateral.skill` from the [latest release](https://github.com/devjoemedia/devjoemedia-plugins/releases/latest) and upload it under **Settings → Capabilities → Skills**. claude.ai has no access to your repo or your network, so attach the logo, screenshots, brand colours and a short product description instead.

## Troubleshooting

| Problem | Fix |
|---|---|
| The skill isn't used | Start a new session after installing, or call `/product-collateral:product-collateral` directly |
| Chromium download fails | `cd collateral && npx playwright install chromium`; behind a proxy, set `HTTPS_PROXY` first |
| Screenshots are blank, 403, or "Client not allowed" | The site blocks headless browsers or your IP. Use your local dev server (`http://localhost:3000`) or give Claude screenshots |
| Pages behind login are missing | The skill never logs in to production. Give it screenshots or screen recordings, or a local environment with test accounts |
| Wrong or system font in the PDF | The font must be on Google Fonts or provided as a file. The render log says `font not loaded` when this happens |
| Logo invisible on the dark cover | Open `assets/brand/logo-proof.png`. If the mark is dark too, supply a light version of the logo |
| A claim is wrong | Correct it in `fact-sheet.md` and tell Claude to update the pieces. It writes copy only from that sheet |
