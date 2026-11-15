// 100% offline PNG card generator for scripture/hymn sharing.
export interface ShareCardOptions {
  topLabel?: string;
  reference?: string;
  text: string;
  bottomLabel?: string;
}

const W = 1080;
const H = 1080;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateShareCardBlob(opts: ShareCardOptions): Promise<Blob> {
  const topLabel = opts.topLabel ?? 'TUZA BIBLE+HYMNAL';
  const bottomLabel = opts.bottomLabel ?? 'REGIS COMMUNITY';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Use the app's webfont when it is available offline (it is precached).
  try {
    await document.fonts?.ready;
  } catch {
    // canvas falls back to the system font
  }

  // Royal-purple gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#431888');
  bg.addColorStop(0.5, '#5B21B6');
  bg.addColorStop(1, '#6D28D9');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
  glow.addColorStop(0, 'rgba(250,204,21,0.12)');
  glow.addColorStop(1, 'rgba(250,204,21,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Gold border with glow
  ctx.save();
  ctx.shadowColor = 'rgba(250,204,21,0.55)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 6;
  const r = 48;
  const m = 60;
  ctx.beginPath();
  ctx.moveTo(m + r, m);
  ctx.lineTo(W - m - r, m);
  ctx.quadraticCurveTo(W - m, m, W - m, m + r);
  ctx.lineTo(W - m, H - m - r);
  ctx.quadraticCurveTo(W - m, H - m, W - m - r, H - m);
  ctx.lineTo(m + r, H - m);
  ctx.quadraticCurveTo(m, H - m, m, H - m - r);
  ctx.lineTo(m, m + r);
  ctx.quadraticCurveTo(m, m, m + r, m);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Top label
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 46px "Space Grotesk", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(250,204,21,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillText(topLabel, W / 2, 130);
  ctx.shadowBlur = 0;

  // Reference
  let y = 210;
  if (opts.reference) {
    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 34px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(opts.reference, W / 2, y);
    y += 60;
  }

  // Main text
  const maxTextWidth = W - 180;
  let fontSize = 44;
  let lines: string[] = [];
  // Fit text by reducing font size if too many lines
  const available = H - y - 160;
  for (let attempt = 0; attempt < 9; attempt++) {
    ctx.font = `500 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
    lines = wrapText(ctx, opts.text, maxTextWidth);
    const totalHeight = lines.length * fontSize * 1.45;
    if (totalHeight <= available || fontSize <= 24) break;
    fontSize -= 5;
  }
  ctx.font = `500 ${fontSize}px "Space Grotesk", system-ui, sans-serif`;
  lines = wrapText(ctx, opts.text, maxTextWidth);
  const lineHeight = fontSize * 1.45;
  const maxLines = Math.max(1, Math.floor(available / lineHeight));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s.,;:]$/, '')}…`;
  }
  const blockHeight = lines.length * lineHeight;
  let ty = y + (H - y - 160 - blockHeight) / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  for (const line of lines) {
    ctx.fillText(line, W / 2, ty);
    ty += lineHeight;
  }
  ctx.shadowBlur = 0;

  // Bottom label
  ctx.fillStyle = '#FACC15';
  ctx.font = 'bold 36px "Space Grotesk", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(250,204,21,0.5)';
  ctx.shadowBlur = 14;
  ctx.fillText(bottomLabel, W / 2, H - 90);
  ctx.shadowBlur = 0;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
