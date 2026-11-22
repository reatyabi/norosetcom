import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Ramer-Douglas-Peucker polygon simplification
function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0, index = 0;
  const a = points[0], b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const num = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    const den = Math.hypot(b.y - a.y, b.x - a.x);
    const d = den === 0 ? Math.hypot(p.x - a.x, p.y - a.y) : num / den;
    if (d > dmax) { index = i; dmax = d; }
  }
  if (dmax > epsilon) {
    const rec1 = rdp(points.slice(0, index + 1), epsilon);
    const rec2 = rdp(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

// Convert points to smooth SVG path with cubic beziers
function pointsToSvgBeziers(pts) {
  if (pts.length < 3) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  const len = pts.length;
  for (let i = 0; i < len; i++) {
    const p0 = pts[(i - 1 + len) % len];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % len];
    const p3 = pts[(i + 2) % len];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + ' Z ';
}

async function run() {
  const inputPng = 'logo_trimmed_4x.png';
  const { data, info } = await sharp(inputPng).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const W = w + 2, H = h + 2;
  const bin = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      bin[(y + 1) * W + (x + 1)] = data[(y * w + x) * 4 + 3] > 120 ? 1 : 0;
    }
  }

  const adj = new Map();
  function addEdge(x1, y1, x2, y2) {
    const k = `${x1},${y1}`, v = `${x2},${y2}`;
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push(v);
  }

  for (let y = 0; y <= H; y++) {
    for (let x = 0; x <= W; x++) {
      if (y > 0 && y < H && x < W) {
        const top = bin[(y - 1) * W + x], bot = bin[y * W + x];
        if (top === 0 && bot === 1) addEdge(x, y, x + 1, y);
        else if (top === 1 && bot === 0) addEdge(x + 1, y, x, y);
      }
      if (x > 0 && x < W && y < H) {
        const left = bin[y * W + (x - 1)], right = bin[y * W + x];
        if (left === 1 && right === 0) addEdge(x, y, x, y + 1);
        else if (left === 0 && right === 1) addEdge(x, y + 1, x, y);
      }
    }
  }

  const cycles = [];
  for (const [startK, list] of adj) {
    while (list.length > 0) {
      const cycle = [];
      let cur = startK;
      while (adj.has(cur) && adj.get(cur).length > 0) {
        const next = adj.get(cur).pop();
        const [cx, cy] = cur.split(',').map(Number);
        cycle.push({ x: cx - 1, y: cy - 1 });
        cur = next;
        if (cur === startK) break;
      }
      if (cycle.length > 15) cycles.push(cycle);
    }
  }

  let noroPaths = '';
  let setPaths = '';

  for (const c of cycles) {
    const simp = rdp(c, 0.9);
    const d = pointsToSvgBeziers(simp);
    const minX = Math.min(...simp.map(p => p.x));
    if (minX < 850) {
      noroPaths += d;
    } else {
      setPaths += d;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="setGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="50%" stop-color="#0EA5E9" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
  </defs>
  <path d="${noroPaths}" fill="#CBD5E1" fill-rule="evenodd" />
  <path d="${setPaths}" fill="url(#setGrad)" fill-rule="evenodd" />
</svg>`;

  fs.writeFileSync('test_vector.svg', svg);
  console.log('Saved test_vector.svg');

  await sharp(Buffer.from(svg))
    .png()
    .toFile('test_vector_render.png');
  console.log('Rendered test_vector_render.png');
}

run().catch(console.error);

