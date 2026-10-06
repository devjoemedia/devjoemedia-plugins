#!/usr/bin/env node
// Image prep for collateral, using Chromium's canvas so there are no native image deps.
//
//   node image-tools.mjs crop  <in> <out.jpg> <x,y,w,h> [--maxw 2400]
//   node image-tools.mjs trim  <in> <out.jpg>            strip solid/dark edges (e.g. video background around a UI frame)
//   node image-tools.mjs logo  <logo.png|jpg> <outDir>   -> logo-color.png, logo-white.png, mark.png (transparent)
//   node image-tools.mjs qr    <url> <out.svg>           needs the `qrcode` npm package
//   node image-tools.mjs frame <video> <seconds> <out.png>  needs ffmpeg on PATH
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest.splice(i, 2)[1] : d; };

const mime = f => (/\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg');
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
    const [src] = a; const img = await load(src); const W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, W, H); const d = im.data;
    const opaqueBg = d[3] === 255 && d[0] > 235 && d[1] > 235 && d[2] > 235;
    if (opaqueBg) { // un-premultiply against white so anti-aliased edges stay smooth
      for (let i = 0; i < d.length; i += 4) {
        const a = Math.min(1, (255 - Math.min(d[i], d[i+1], d[i+2])) / 195);
        if (a < 0.02) { d[i+3] = 0; continue; }
        for (let k = 0; k < 3; k++) d[i+k] = Math.max(0, Math.min(255, (d[i+k] - (1 - a) * 255) / a));
        d[i+3] = Math.round(a * 255);
      }
    }
    g.putImageData(im, 0, 0);
    // bounding box of ink
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y*W+x)*4+3] > 10) { x0 = Math.min(x0,x); x1 = Math.max(x1,x); y0 = Math.min(y0,y); y1 = Math.max(y1,y); }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const cut = (sx, sw) => { const o = document.createElement('canvas'); o.width = sw; o.height = ch; o.getContext('2d').drawImage(c, sx, y0, sw, ch, 0, 0, sw, ch); return o; };
    const color = cut(x0, cw);
    // A horizontal lockup is "mark | gap | wordmark": find the first empty column after the mark.
    const cd = color.getContext('2d').getImageData(0, 0, cw, ch).data;
    const empty = x => { for (let y = 0; y < ch; y++) if (cd[(y*cw+x)*4+3] > 10) return false; return true; };
    let gap = -1; for (let x = Math.floor(cw * 0.05); x < cw * 0.5; x++) if (empty(x)) { gap = x; break; }
    const white = document.createElement('canvas'); white.width = cw; white.height = ch; const wg = white.getContext('2d'); wg.drawImage(color, 0, 0);
    const wi = wg.getImageData(0, 0, cw, ch); const wd = wi.data;
    // Wordmark goes white for dark backgrounds; the coloured mark keeps its colours.
    for (let y = 0; y < ch; y++) for (let x = (gap > 0 ? gap : 0); x < cw; x++) { const i = (y*cw+x)*4; wd[i] = wd[i+1] = wd[i+2] = 255; }
    wg.putImageData(wi, 0, 0);
    const out = { color: color.toDataURL('image/png'), white: white.toDataURL('image/png'), gap };
    if (gap > 0) { const m = document.createElement('canvas'); m.width = gap; m.height = ch; m.getContext('2d').drawImage(color, 0, 0, gap, ch, 0, 0, gap, ch); out.mark = m.toDataURL('image/png'); }
    return out; })();`), dataUrl(inp));
  save(res.color, path.join(outDir, 'logo-color.png'));
  save(res.white, path.join(outDir, 'logo-white.png'));
  if (res.mark) save(res.mark, path.join(outDir, 'mark.png'));
  console.log(`logo -> ${outDir}/logo-color.png, logo-white.png${res.mark ? ', mark.png' : ''}`);
  console.log(res.gap > 0 ? 'detected mark + wordmark lockup; only the wordmark was turned white' : 'no mark/wordmark gap found; the whole logo was turned white');
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
