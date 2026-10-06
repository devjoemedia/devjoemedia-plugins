# Capturing real product imagery

Collateral that shows the real UI is believable. Collateral with stock art or mocked screens isn't.
The sources, in order of preference:

1. **Live site/app**: `shoot.mjs --base https://product.com …` (production is usually the richest in content).
2. **Local dev server**: `--base http://localhost:PORT` when there's no public deployment. Seed data can look thin, so pick pages with content.
3. **Existing videos and screen recordings** (demo videos, how-to clips, launch videos): `image-tools.mjs frame` grabs a frame, then `trim` cuts away the video background.
4. **App store screenshots / existing marketing images** in the repo (`public/screenshots`, `assets/marketing`).

Pages behind a login are the usual gap. Never type real passwords or create accounts on a production site to get them. Instead, use recordings (option 3). Or ask the user for screenshots, or for a local dev environment with test credentials.

## Shot list

Plan around the layouts. A typical product needs:
- **Desktop, viewport (`d`)**: home, each pillar/landing page, a detail page per pillar, a storefront/business page. These go in browser frames.
- **Desktop, full page (`df`)**: home and the main landing pages. Crop sections out of them (feature grids, promoted rows, social feeds) for wide strips.
- **Mobile, viewport (`m`)**: home, each pillar, 2–3 detail pages, sign-in/sign-up. These go in phone frames, which carry most of the visual weight.
- **Flows**: the main creation flow step by step (the posting wizard, onboarding, checkout), and account screens. These usually come from recordings.

Pull real deep links from the pages first, e.g. a quick Playwright `$$eval('a[href]')` on the home page. Then shoot detail pages that have good photos.

## Cropping

- `crop in out.jpg x,y,w,h --maxw 2400`, for sections of full-page shots. Desktop shots are @2x, so CSS pixel coordinates double.
- Find coordinates by viewing a downscaled copy of the full-page shot, then multiplying back up.
- Mobile phone frames: crop the viewport shot to `0,0,1170,2532` (@3x 390×844) at `--maxw 900`.
- Video frames: crop roughly to the UI window, then `trim` to strip the coloured background on the edges.
- Recorded frames often include their own fake browser chrome. If so, drop the `.bar` from your `.browser` frame so you don't get two title bars.

## Etiquette and reliability

- **Sequential, with pauses.** `shoot.mjs` waits between pages on purpose. Firing many captures in parallel can trigger rate limits or IP bans on the product's own API.
- **Normal browser UA.** Some WAFs block the `HeadlessChrome` user agent. The script sends a regular Chrome/Safari UA.
- **Cookie banners.** The script clicks *Reject all*/*Decline*, which is the privacy-preserving choice and also gives clean shots. If a banner survives, re-shoot. Don't accept on the user's behalf.
- **Install / app banners** are hidden with a style override. Check the bottom of phone shots anyway.
- **Personal data.** Avoid screens showing other people's names, phone numbers or faces in account areas. Blurred profile frames are fine. Listings and business pages are public by design.
- **Timeouts** (`networkidle` never settles on sites with live sockets) are logged as warnings and the page is captured anyway. Check those shots.
