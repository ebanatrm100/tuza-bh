// Generates the PWA PNG icons (192, 512, maskable, apple-touch) using zlib only.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.join(process.cwd(), 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function makeIcon(size, rounded = true) {
  const px = Buffer.alloc(size * size * 4);
  const metal = hex('#FACC15');
  const metalDeep = hex('#F59E0B');
  const coral = hex('#F43F5E');
  const paper = hex('#FFF7ED');
  const paperShade = hex('#E9E4FF');
  const bgStart = hex('#431888');
  const bgMid = hex('#5B21B6');
  const bgEnd = hex('#6D28D9');

  const u = (v) => (v / 512) * size;

  const put = (x, y, rgb, a = 1) => {
    if (x < 0 || y < 0 || x >= size || y >= size || a <= 0) return;
    const i = (y * size + x) * 4;
    const alpha = Math.min(1, a);
    px[i] = Math.round(px[i] * (1 - alpha) + rgb[0] * alpha);
    px[i + 1] = Math.round(px[i + 1] * (1 - alpha) + rgb[1] * alpha);
    px[i + 2] = Math.round(px[i + 2] * (1 - alpha) + rgb[2] * alpha);
    px[i + 3] = 255;
  };

  // background: diagonal royal purple gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.min(1, (x / size) * 0.55 + (y / size) * 0.45);
      const c = t < 0.5
        ? bgStart.map((v, k) => v + (bgMid[k] - v) * (t / 0.5))
        : bgMid.map((v, k) => v + (bgEnd[k] - v) * ((t - 0.5) / 0.5));
      put(x, y, c);
    }
  }

  // dotted corner grid
  const dotStep = u(20);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nearCorner = x < size * 0.3 && y < size * 0.3;
      if (!nearCorner) continue;
      const dx = x % dotStep;
      const dy = y % dotStep;
      if (dx < u(2.5) && dy < u(2.5)) put(x, y, [255, 255, 255], 0.18);
    }
  }

  // warm halo
  const cx = u(256);
  const cy = u(268);
  const haloR = u(210);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy) / haloR;
      if (d < 1) put(x, y, metal, 0.16 * (1 - d) ** 2);
    }
  }

  const inPoly = (x, y, pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  const fillPoly = (pts, color, shade) => {
    const ys = pts.map((p) => p[1]);
    const xs = pts.map((p) => p[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        if (inPoly(x, y, pts)) put(x, y, shade ? shade(x, y) : color);
      }
    }
  };

  // book shadow
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = ((x - u(256)) / u(190)) ** 2 + ((y - u(392)) / u(26)) ** 2;
      if (d < 1) put(x, y, [26, 8, 56], 0.5 * (1 - d));
    }
  }

  // open book pages
  const leftPage = [[u(88), u(236)], [u(252), u(272)], [u(252), u(392)], [u(88), u(352)]];
  const rightPage = [[u(424), u(236)], [u(260), u(272)], [u(260), u(392)], [u(424), u(352)]];
  fillPoly(leftPage, paper, (x, y) => {
    const t = (x - u(88)) / u(164);
    return paper.map((v, k) => Math.round(v + (paperShade[k] - v) * t));
  });
  fillPoly(rightPage, paper, (x, y) => {
    const t = (u(424) - x) / u(164);
    return paper.map((v, k) => Math.round(v + (paperShade[k] - v) * t * 0.9));
  });

  // text lines on pages
  for (let line = 0; line < 5; line++) {
    const y0 = u(300 + line * 18);
    const w = line === 4 ? u(90) : u(120);
    for (let x = u(112); x < u(112) + w; x++) {
      for (let y = y0; y < y0 + u(5); y++) put(x, y, [139, 123, 199], 0.5);
    }
    for (let x = u(280); x < u(280) + w; x++) {
      for (let y = y0; y < y0 + u(5); y++) put(x, y, [139, 123, 199], 0.45);
    }
  }

  // gold spine
  for (let y = u(266); y < u(398); y++) {
    for (let x = u(246); x < u(266); x++) put(x, y, metal);
  }

  // glow cross above the book
  const crossV = { x: u(238), y: u(96), w: u(36), h: u(168) };
  const crossH = { x: u(196), y: u(140), w: u(120), h: u(34) };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inV = x >= crossV.x && x < crossV.x + crossV.w && y >= crossV.y && y < crossV.y + crossV.h;
      const inH = x >= crossH.x && x < crossH.x + crossH.w && y >= crossH.y && y < crossH.y + crossH.h;
      if (inV || inH) {
        const t = (y - u(90)) / u(180);
        put(x, y, metal.map((v, k) => Math.round(v + (metalDeep[k] - v) * Math.max(0, Math.min(1, t)))));
      }
    }
  }

  // coral accent dot
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x - u(362)) ** 2 + (y - u(150)) ** 2 < u(26) ** 2) put(x, y, coral);
    }
  }

  // rounded corners
  const radius = rounded ? u(96) : 0;
  if (radius > 0) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
        const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
        if (Math.hypot(dx, dy) > radius) px[(y * size + x) * 4 + 3] = 0;
      }
    }
  }

  return encodePNG(size, size, px);
}

fs.writeFileSync(path.join(OUT, 'icon-192.png'), makeIcon(192, false));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), makeIcon(512));
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), makeIcon(512, false));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), makeIcon(180, false));
console.log('Icons written to public/icons');
