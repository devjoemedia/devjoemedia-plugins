# Footprintts plugins

A Claude Code plugin marketplace.

| Plugin | What it does |
|---|---|
| [`product-collateral`](plugins/product-collateral/skills/product-collateral/SKILL.md) | Turns any product codebase into print-ready PDFs: trifold brochure, multi-page platform brochure, onboarding deck, one-pager. It uses the product's own brand tokens, logo, copy and real screenshots. |

## Install

In Claude Code:

```
/plugin marketplace add devjoemedia/footprintts-plugins
/plugin install product-collateral@footprintts-plugins
```

Or from a shell:

```bash
claude plugin marketplace add devjoemedia/footprintts-plugins
claude plugin install product-collateral@footprintts-plugins
```

A full git URL or a local path also works.

**Update** to the latest version:

```bash
claude plugin marketplace update footprintts-plugins
```

### Roll it out to a whole team

Commit this to a project's `.claude/settings.json`. Everyone who trusts the project then gets prompted to install it:

```json
{
  "extraKnownMarketplaces": {
    "footprintts-plugins": {
      "source": { "source": "github", "repo": "devjoemedia/footprintts-plugins" }
    }
  },
  "enabledPlugins": {
    "product-collateral@footprintts-plugins": true
  }
}
```

### claude.ai

Upload `product-collateral.skill` from the latest GitHub release under **Settings → Capabilities → Skills**.

## Using product-collateral

Open Claude Code in a product's repo and ask, for example:

- "Make a trifold brochure for this app, clean like a professional print piece"
- "Create a platform brochure and an onboarding deck — here's a sample PDF to match: ~/Downloads/sample.pdf"

The skill extracts the brand, writes a sourced fact sheet, captures desktop and mobile screens (one page at a time), and lays out the pages from tested blueprints. It renders to PDF, reviews its own contact sheet, and ends with a list of claims to confirm before printing.

**Requirements:** Node 18+. The setup step installs Playwright (Chromium) and `qrcode` into a local `collateral/` work folder. `ffmpeg` is optional, for grabbing frames from demo videos.

## Contributing

```bash
claude plugin validate .        # validates the marketplace and plugin manifests
```

Bump `version` in both `.claude-plugin/marketplace.json` and the plugin's `plugin.json` when you change a plugin. Installed copies only update when the version changes.
