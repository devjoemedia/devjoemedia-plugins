#!/usr/bin/env node
// Render a collateral HTML file (one `.page` element per printed page/slide) to PDF,
// then screenshot every page and build a contact sheet for visual QA.
//
//   node render.mjs <src.html> [out.pdf] [--previews <dir>] [--scale 1]
//
// Page size comes from the document's own `@page { size: ... }` rule and the first
// `.page` element's box, so the same script handles A4 brochures, trifolds and 16:9 decks.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : dflt; };
const scale = Number(flag('--scale', '1'));
let previews = flag('--previews', null);
const [src, outArg] = args;
if (!src) { console.error('usage: node render.mjs <src.html> [out.pdf] [--previews dir] [--scale 1]'); process.exit(1); }

const out = outArg || path.join('out', `${path.basename(src, '.html')}.pdf`);
// Previews are named after the PDF so several renders of one template don't overwrite each other.
previews = previews || path.join(path.dirname(out), 'preview', path.basename(out, '.pdf'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.mkdirSync(previews, { recursive: true });

const browser = await chromium.launch();
const probe = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await probe.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
const box = await probe.$eval('.page', el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
await probe.close();

const page = await browser.newPage({ viewport: { width: box.w, height: box.h }, deviceScaleFactor: scale });
await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const report = await page.evaluate(() => {
  const issues = [];
  document.querySelectorAll('img').forEach(img => { if (!img.complete || img.naturalWidth === 0) issues.push(`broken image: ${img.getAttribute('src')}`); });
  const fam = getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  if (!document.fonts.check(`16px "${fam}"`)) issues.push(`font not loaded: ${fam} (falling back to system font)`);
  // Layout QA per region: every .page, plus every .panel (trifold columns) or [data-qa-region].
  // Looks for overflow, empty holes between blocks, and a large unused bottom.
  const visibleBox = (el, region) => {
    if (el.closest('.pf, .ft, .foot, .glow')) return null;
    const r = el.getBoundingClientRect(); const rr = region.getBoundingClientRect();
    if (!r.height || !r.width || r.height > rr.height * 0.9) return null; // full-height columns are layout, not content
    const cs = getComputedStyle(el);
    const painted = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
    const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const leaf = ownText || /^(IMG|CANVAS|HR)$/.test(el.tagName) || el.tagName.toLowerCase() === 'svg';
    if (!painted && !leaf) return null;
    let top = r.top, bottom = r.bottom, floating = false;
    for (let a = el; a && a !== region; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.position === 'absolute' || acs.position === 'fixed') floating = true;
      if (a !== el && acs.overflow !== 'visible') { const ar = a.getBoundingClientRect(); top = Math.max(top, ar.top); bottom = Math.min(bottom, ar.bottom); }
    }
    // Absolutely placed phones/screens fill space but are clamped, so decorative overhang isn't "overflow".
    if (floating) { top = Math.max(top, rr.top); bottom = Math.min(bottom, rr.bottom); }
    return bottom > top ? [top - rr.top, bottom - rr.top] : null;
  };
  const check = (region, label) => {
    const H = region.getBoundingClientRect().height;
    const spans = [];
    region.querySelectorAll('*').forEach(el => { const b = visibleBox(el, region); if (b) spans.push(b); });
    if (!spans.length) return;
    spans.sort((p, q) => p[0] - q[0]);
    const merged = [spans[0].slice()];
    for (const [t, b] of spans.slice(1)) { const m = merged[merged.length - 1]; if (t <= m[1] + 1) m[1] = Math.max(m[1], b); else merged.push([t, b]); }
    const lowest = Math.max(...merged.map(m => m[1]));
    if (lowest > H + 1) issues.push(`${label}: content overflows the bottom by ${Math.round(lowest - H)}px`);
    const relaxed = region.classList.contains('allow-space') || getComputedStyle(region).justifyContent === 'center';
    if (relaxed) return;
    // Slides centre their body on purpose, so they tolerate bigger gaps than print pages and panels.
    const rb = region.getBoundingClientRect(); const slide = rb.width > rb.height * 1.5;
    const holeMax = H * (slide ? 0.26 : 0.12), bottomMax = H * (slide ? 0.38 : 0.3);
    let gap = 0, at = 0;
    for (let i = 1; i < merged.length; i++) { const g = merged[i][0] - merged[i - 1][1]; if (g > gap) { gap = g; at = merged[i - 1][1]; } }
    if (gap > Math.max(48, holeMax)) issues.push(`${label}: ${Math.round(gap)}px empty hole at ${Math.round(at / H * 100)}% down — fill it with real content or tighten spacing`);
    const unused = H - lowest;
    if (unused > bottomMax) issues.push(`${label}: bottom ${Math.round(unused / H * 100)}% is empty — rebalance or add content`);
  };
  document.querySelectorAll('.page').forEach((pg, i) => {
    const h = pg.getBoundingClientRect().height;
    // Fractional heights (e.g. 210mm = 793.7px) make the PDF bleed a 1px strip onto the next page.
    if (Math.abs(h - Math.round(h)) > 0.01) issues.push(`page ${i + 1}: height is ${h.toFixed(2)}px — use a whole-pixel height (e.g. ${Math.floor(h)}px) to stop a strip bleeding onto the next page`);
    const panels = pg.querySelectorAll('.panel, [data-qa-region]');
    if (panels.length) panels.forEach((pn, j) => check(pn, `page ${i + 1} panel ${j + 1}`));
    else check(pg, `page ${i + 1}`);
  });
  return { pages: document.querySelectorAll('.page').length, issues };
});

await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });

const shots = [];
const els = await page.$$('.page');
for (let i = 0; i < els.length; i++) {
  const file = path.join(previews, `${String(i + 1).padStart(2, '0')}.png`);
  await els[i].screenshot({ path: file });
  shots.push(file);
}

// Contact sheet: every page side by side, for a one-glance layout review.
// Size thumbnails so the sheet is ~1800px wide whatever the page count, keeping short documents legible.
const cols = Math.min(shots.length, box.w > box.h ? (shots.length <= 2 ? 2 : 4) : 5);
const thumbW = Math.floor((1800 - 8 * (cols + 1)) / cols);
const html = `<body style="margin:0;background:#8a8f99;display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:8px;padding:8px;width:max-content">${
  shots.map(f => `<img style="width:${thumbW}px;display:block" src="${pathToFileURL(path.resolve(f)).href}">`).join('')}</body>`;
const sheetHtml = path.join(previews, '_sheet.html');
fs.writeFileSync(sheetHtml, html);
const sheet = await browser.newPage({ viewport: { width: cols * (thumbW + 8) + 8, height: 600 } });
await sheet.goto(pathToFileURL(path.resolve(sheetHtml)).href, { waitUntil: 'load' });
await sheet.screenshot({ path: path.join(previews, 'sheet.png'), fullPage: true });
fs.unlinkSync(sheetHtml);

await browser.close();
console.log(`${out}  (${report.pages} pages, ${box.w}x${box.h}px)`);
console.log(`previews: ${previews}/NN.png  contact sheet: ${previews}/sheet.png`);
if (report.issues.length) { console.log('QA warnings:'); report.issues.forEach(m => console.log('  - ' + m)); }
else console.log('QA: no warnings');
