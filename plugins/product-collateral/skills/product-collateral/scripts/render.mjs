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

const name = path.basename(src, '.html');
const out = outArg || path.join('out', `${name}.pdf`);
previews = previews || path.join('out', 'preview', name);
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
  // Content that spills past its page's bottom edge or under the footer gets cut in print.
  document.querySelectorAll('.page').forEach((pg, i) => {
    const pr = pg.getBoundingClientRect();
    let lowest = 0;
    pg.querySelectorAll('*').forEach(el => {
      if (el.closest('.pf, .ft, .foot, .glow')) return;
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width || r.height > pr.height * 0.9) return; // full-height columns/panels are layout, not content
      // Skip decoration that is positioned out of flow; clip to any overflow:hidden ancestor.
      let bottom = r.bottom;
      for (let a = el; a && a !== pg; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.position === 'absolute' || cs.position === 'fixed') return;
        if (a !== el && cs.overflow !== 'visible') bottom = Math.min(bottom, a.getBoundingClientRect().bottom);
      }
      lowest = Math.max(lowest, bottom - pr.top);
    });
    const fill = lowest / pr.height;
    if (lowest > pr.height - 2) issues.push(`page ${i + 1}: content overflows the page bottom`);
    else if (fill < 0.62 && !pg.classList.contains('allow-space') && getComputedStyle(pg).justifyContent !== 'center') issues.push(`page ${i + 1}: only ${Math.round(fill * 100)}% of the height is used — rebalance or add content`);
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
const cols = box.w > box.h ? 4 : 5;
const thumbW = 360;
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
