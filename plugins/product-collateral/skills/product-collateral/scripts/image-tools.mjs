#!/usr/bin/env node
// Image prep for collateral, using Chromium's canvas so there are no native image deps.
//
//   node image-tools.mjs crop  <in> <out.jpg> <x,y,w,h> [--maxw 2400]
//   node image-tools.mjs trim  <in> <out.jpg>            strip solid/dark edges (e.g. video background around a UI frame)
//   node image-tools.mjs logo  <logo.svg|png|jpg> <outDir> -> logo-color.png, logo-white.png, [mark.png], logo-proof.png
//   node image-tools.mjs qr    <url> <out.svg>           needs the `qrcode` npm package
//   node image-tools.mjs frame <video> <seconds> <out.png>  needs ffmpeg on PATH
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest.splice(i, 2)[1] : d; };

const mime = f => (/\.png$/i.test(f) ? 'image/png' : /\.svg$/i.test(f) ? 'image/svg+xml' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');
const dataUrl = f => `data:${mime(f)};base64,${fs.readFileSync(f).toString('base64')}`;
const save = (url, out) => { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); };

async function withCanvas(fn, ...a) {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage();
  try { return await p.evaluate(fn, a); } finally { await b.close(); }
}

// Runs in the browser: helpers are inlined because evaluate() serialises the function.
const loadImg = `const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });`;

if (cmd === 'crop') {
  const [inp, out, box] = rest; const maxw = Number(flag('--maxw', '2400'));
  const [x, y, w, h] = box.split(',').map(Number);
  const url = await withCanvas(new Function('a', `${loadImg} return (async () => {
    const [src, x, y, w, h, maxw, type] = a; const img = await load(src);
    const s = Math.min(1, maxw / w); const c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return c.toDataURL(type, 0.9); })();`), dataUrl(inp), x, y, w, h, maxw, mime(out));
  save(url, out); console.log('crop ->', out);
}

else if (cmd === 'trim') {
  const [inp, out] = rest;
  const res = await withCanvas(new Function('a', `${loadImg} return (async () => {
    const [src, type] = a; const img = await load(src); const W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data; const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2]]; };
    const ref = px(2, Math.floor(H / 2)); // sample the left edge colour
    const near = p => Math.abs(p[0]-ref[0]) + Math.abs(p[1]-ref[1]) + Math.abs(p[2]-ref[2]) < 60;
    const colBg = x => { let n = 0, t = 0; for (let y = 0; y < H; y += 6) { t++; if (near(px(x, y))) n++; } return n / t > 0.5; };
    const rowBg = y => { let n = 0, t = 0; for (let x = 0; x < W; x += 6) { t++; if (near(px(x, y))) n++; } return n / t > 0.5; };
    let l = 0, r = W - 1, t = 0, b = H - 1;
    while (l < W / 2 && colBg(l)) l++; while (r > W / 2 && colBg(r)) r--;
    while (t < H / 2 && rowBg(t)) t++; while (b > H / 2 && rowBg(b)) b--;
    const o = document.createElement('canvas'); o.width = r - l + 1; o.height = b - t + 1;
    o.getContext('2d').drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
    return { url: o.toDataURL(type, 0.9), cut: [l, t, W - 1 - r, H - 1 - b] }; })();`), dataUrl(inp), mime(out));
  save(res.url, out); console.log('trim ->', out, 'cut left,top,right,bottom =', res.cut.join(','));
}

else if (cmd === 'logo') {
  const [inp, outDir] = rest;
  const res = await withCanvas(new Function('a', `${loadImg} return (async () => {
    const [src] = a; const img = await load(src);
    // SVGs (and small PNGs) are rasterised at >= 1600px wide so print stays sharp.
    const k = Math.max(1, 1600 / (img.naturalWidth || img.width || 1600));
    const W = Math.round((img.naturalWidth || 1600) * k), H = Math.round((img.naturalHeight || 400) * k);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
    const im = g.getImageData(0, 0, W, H); const d = im.data;
    const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
    const dist = (p, q) => Math.abs(p[0]-q[0]) + Math.abs(p[1]-q[1]) + Math.abs(p[2]-q[2]);
    // Background = the corners, if they agree and are opaque (white, off-white, any flat colour).
    const corners = [at(1,1), at(W-2,1), at(1,H-2), at(W-2,H-2)];
    const bg = corners[0];
    const flatBg = corners.every(p => p[3] === 255 && dist(p, bg) < 24);
    if (flatBg) {
      let far = 1; for (let i = 0; i < d.length; i += 4) far = Math.max(far, dist([d[i],d[i+1],d[i+2]], bg));
      for (let i = 0; i < d.length; i += 4) {
        const p = [d[i], d[i+1], d[i+2]]; const al = Math.min(1, dist(p, bg) / Math.max(90, far * 0.6));
        if (al < 0.04) { d[i+3] = 0; continue; }
        for (let j = 0; j < 3; j++) d[i+j] = Math.max(0, Math.min(255, (p[j] - (1 - al) * bg[j]) / al));
        d[i+3] = Math.round(al * 255);
      }
      g.putImageData(im, 0, 0);
    }
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y*W+x)*4+3] > 10) { x0 = Math.min(x0,x); x1 = Math.max(x1,x); y0 = Math.min(y0,y); y1 = Math.max(y1,y); }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const color = document.createElement('canvas'); color.width = cw; color.height = ch; color.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    const cd = color.getContext('2d').getImageData(0, 0, cw, ch).data;
    // The wordmark is the most common solid colour; marks and accents (gradients, a green tick) differ from it.
    const bins = new Map();
    for (let i = 0; i < cd.length; i += 4) if (cd[i+3] > 220) { const key = (cd[i]>>4)+','+(cd[i+1]>>4)+','+(cd[i+2]>>4); bins.set(key, (bins.get(key)||0)+1); }
    const top = [...bins.entries()].sort((p, q) => q[1]-p[1])[0][0].split(',').map(v => v*16+8);
    const lum = (0.2126*top[0] + 0.7152*top[1] + 0.0722*top[2]) / 255;
    const white = document.createElement('canvas'); white.width = cw; white.height = ch; const wg = white.getContext('2d'); wg.drawImage(color, 0, 0);
    const wi = wg.getImageData(0, 0, cw, ch); const wd = wi.data; let changed = 0, ink = 0;
    for (let i = 0; i < wd.length; i += 4) {
      if (wd[i+3] < 10) continue; ink++;
      // Dark, ink-coloured pixels turn white for dark backgrounds; brand colours stay.
      if (dist([wd[i],wd[i+1],wd[i+2]], top) < 100 || (wd[i]+wd[i+1]+wd[i+2]) / 3 < 40) { wd[i] = wd[i+1] = wd[i+2] = 255; changed++; }
    }
    wg.putImageData(wi, 0, 0);
    // A separate mark exists only if the part left of the first gap is NOT wordmark-coloured.
    const empty = x => { for (let y = 0; y < ch; y++) if (cd[(y*cw+x)*4+3] > 10) return false; return true; };
    let gap = -1; for (let x = Math.floor(cw * 0.04); x < cw * 0.45; x++) if (empty(x)) { gap = x; break; }
    let mark = null;
    if (gap > 0) {
      let n = 0, same = 0;
      for (let y = 0; y < ch; y++) for (let x = 0; x < gap; x++) { const i = (y*cw+x)*4; if (cd[i+3] > 220) { n++; if (dist([cd[i],cd[i+1],cd[i+2]], top) < 100) same++; } }
      if (n && same / n < 0.5) { const m = document.createElement('canvas'); m.width = gap; m.height = ch; m.getContext('2d').drawImage(color, 0, 0, gap, ch, 0, 0, gap, ch); mark = m.toDataURL('image/png'); }
    }
    // Proof sheet: both variants on light and dark, so the result can be checked by eye.
    const pad = Math.round(ch * 0.4), proof = document.createElement('canvas'); proof.width = cw + pad*2; proof.height = (ch + pad*2) * 2;
    const pg = proof.getContext('2d'); pg.fillStyle = '#ffffff'; pg.fillRect(0, 0, proof.width, ch + pad*2); pg.drawImage(color, pad, pad);
    pg.fillStyle = '#0d1220'; pg.fillRect(0, ch + pad*2, proof.width, ch + pad*2); pg.drawImage(white, pad, ch + pad*3);
    return { color: color.toDataURL('image/png'), white: white.toDataURL('image/png'), mark, proof: proof.toDataURL('image/png'),
             ink: top, lum, share: ink ? changed / ink : 0, flatBg, bg }; })();`), dataUrl(inp));
  save(res.color, path.join(outDir, 'logo-color.png'));
  save(res.white, path.join(outDir, 'logo-white.png'));
  save(res.proof, path.join(outDir, 'logo-proof.png'));
  if (res.mark) save(res.mark, path.join(outDir, 'mark.png'));
  const hex = '#' + res.ink.map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
  console.log(`logo -> ${outDir}/logo-color.png, logo-white.png${res.mark ? ', mark.png' : ''}, logo-proof.png`);
  console.log(`background ${res.flatBg ? 'rgb(' + res.bg.slice(0,3).join(',') + ') removed' : 'already transparent / not flat (kept)'}; wordmark ink ~${hex} (luminance ${res.lum.toFixed(2)})`);
  console.log(`${Math.round(res.share * 100)}% of ink turned white; other brand colours kept.${res.mark ? ' Separate mark detected.' : ' No separate mark (wordmark-only or mark matches wordmark).'}`);
  if (res.lum > 0.6) console.log('note: the wordmark is already light — it will not show on white paper; you may need a dark variant instead.');
  console.log('Open logo-proof.png and check both rows before using them.');
}

else if (cmd === 'qr') {
  const [url, out] = rest;
  let QR; try { QR = require('qrcode'); } catch { console.error('missing dependency: run `npm i qrcode` in the work directory'); process.exit(1); }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, await QR.toString(url, { type: 'svg', margin: 0, color: { dark: '#111827', light: '#0000' } }));
  console.log('qr ->', out);
}

else if (cmd === 'frame') {
  const [video, sec, out] = rest;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(sec), '-i', video, '-frames:v', '1', '-y', out]);
  console.log('frame ->', out);
}

else {
  console.error('commands: crop | trim | logo | qr | frame  (see header of this file)');
  process.exit(1);
}
