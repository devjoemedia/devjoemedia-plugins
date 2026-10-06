#!/usr/bin/env node
// Capture real product screens for collateral — desktop and mobile, viewport or full page.
//
//   node shoot.mjs --base https://example.com [--out assets/shots] [--delay 1500] [--text] \
//        "home|d|/"  "home|m|/"  "market|df|/market"  "pdp|m|/item/123"
//
// Each spec is name|mode|path. mode: d = desktop 1440x900 @2x, m = mobile 390x844 @3x,
// add f for a full-page capture (scrolls first so lazy sections load). --text also prints each
// page's visible text, which is the best source of real marketing copy.
//
// Captures run one at a time with a pause between them: many APIs ban IPs that burst requests.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const bool = n => { const i = args.indexOf(n); if (i >= 0) { args.splice(i, 1); return true; } return false; };
const base = flag('--base', 'http://localhost:3000').replace(/\/$/, '');
const outDir = flag('--out', 'assets/shots');
const delay = Number(flag('--delay', '1500'));
const dumpText = bool('--text');
fs.mkdirSync(outDir, { recursive: true });

// Headless Chrome's default UA ("HeadlessChrome") is blocked by some sites/WAFs; send a normal one.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const MUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// Privacy-preserving choice first: decline optional cookies rather than accept them.
const DECLINE = ['Reject all', 'Reject All', 'Decline', 'Decline all', 'Only necessary', 'Necessary only', 'Reject'];

const browser = await chromium.launch();
const desk = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const mob = await browser.newContext({ userAgent: MUA, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function dismiss(p) {
  for (const name of DECLINE) {
    const b = p.getByRole('button', { name, exact: true });
    if (await b.count()) { await b.first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(500); return; }
  }
}

for (const spec of args) {
  const [name, mode = 'd', urlPath = '/'] = spec.split('|');
  const p = await (mode.startsWith('m') ? mob : desk).newPage();
  const url = urlPath.startsWith('http') ? urlPath : base + urlPath;
  try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); }
  catch (e) { console.log(`warn ${name}: ${e.message.split('\n')[0]} (capturing anyway)`); }
  await p.waitForTimeout(3000);
  await dismiss(p);
  // Install/app banners pinned to the bottom ruin phone shots.
  await p.addStyleTag({ content: '[class*="install" i],[id*="install" i],[class*="app-banner" i]{display:none!important}' }).catch(() => {});
  const full = mode.includes('f');
  if (full) {
    for (let y = 0; y < 8000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(450); }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2000);
    await dismiss(p);
  }
  const file = path.join(outDir, `${name}.png`);
  await p.screenshot({ path: file, fullPage: full });
  console.log(`ok ${name} -> ${file}  (${p.url()})`);
  if (dumpText) {
    const text = await p.innerText('main').catch(() => p.innerText('body'));
    console.log(`--- text: ${name} ---\n${text.slice(0, 4000)}\n--- end ${name} ---`);
  }
  await p.close();
  await new Promise(r => setTimeout(r, delay));
}
await browser.close();
