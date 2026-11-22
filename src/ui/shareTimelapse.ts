import { bodySvg, type Look } from '../art/avatar';

/** Draws the timelapse frames side by side into one PNG for sharing. */
export async function timelapsePng(frames: { label: string; look: Look }[]): Promise<Blob> {
  const h = 440, w = 200, pad = 24, labelH = 44;
  const canvas = document.createElement('canvas');
  canvas.width = pad + frames.length * (w + pad);
  canvas.height = pad + h + labelH + pad;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.fillStyle = '#E8F0F2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#14233B';
  ctx.font = '600 24px "Golos Text Variable", system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [i, f] of frames.entries()) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bodySvg(f.look, { height: h }))}`;
    await img.decode();
    const x = pad + i * (w + pad);
    ctx.drawImage(img, x, pad, w, h);
    ctx.fillText(f.label, x + w / 2, pad + h + 32);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}
