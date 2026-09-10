// Rebuild the bundled animation with the API's existing canvas dependency:
// node api/scripts/generate-vote-celebration.cjs
const { createCanvas, GifEncoder } = require('@napi-rs/canvas');
const { mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const width = 320;
const height = 240;
const frames = 48;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
const preview = process.argv.includes('--preview')
  ? createCanvas(width * 3, height)
  : null;
const encoder = new GifEncoder(width, height, { repeat: 0, quality: 10 });
const colors = ['#fbbf24', '#fb7185', '#38bdf8', '#a78bfa', '#34d399'];

for (let frame = 0; frame < frames; frame += 1) {
  const phase = frame / frames;
  ctx.fillStyle = '#111c35';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1b2a46';
  ctx.beginPath();
  ctx.arc(160, 124, 77, 0, Math.PI * 2);
  ctx.fill();

  // Fixed trajectories keep asset generation reproducible and the loop seamless.
  for (let piece = 0; piece < 65; piece += 1) {
    const x =
      ((piece * 79) % width) + Math.sin(phase * Math.PI * 2 + piece) * 12;
    const y =
      ((((piece * 43) % (height + 24)) + phase * (height + 24)) %
        (height + 24)) -
      12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(phase * Math.PI * 2 + piece);
    ctx.fillStyle = colors[piece % colors.length];
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(160, 125 + Math.sin(phase * Math.PI * 2) * 4);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(-60, -45, 120, 49, 20);
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(-43, -55);
  ctx.lineTo(43, -55);
  ctx.lineTo(34, -5);
  ctx.quadraticCurveTo(0, 37, -34, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-7, 17, 14, 24);
  ctx.beginPath();
  ctx.roundRect(-31, 39, 62, 12, 5);
  ctx.fill();

  ctx.fillStyle = '#fff4bd';
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const radius = point % 2 ? 8 : 18;
    const x = Math.cos(angle) * radius;
    const y = -23 + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (preview && frame % 16 === 0) {
    preview.getContext('2d').drawImage(canvas, (frame / 16) * width, 0);
  }
  encoder.addFrame(
    new Uint8Array(ctx.getImageData(0, 0, width, height).data),
    width,
    height,
    { delay: 80 },
  );
}

const target = resolve(__dirname, '../../public/images/telegram');
mkdirSync(target, { recursive: true });
const bytes = encoder.finish();
writeFileSync(resolve(target, 'vote-celebration.gif'), bytes);
if (preview) {
  const cache = resolve(__dirname, '../.cache');
  mkdirSync(cache, { recursive: true });
  writeFileSync(
    resolve(cache, 'vote-celebration-preview.png'),
    preview.toBuffer('image/png'),
  );
}
console.log(
  `Generated ${frames} frames, ${width}x${height}, ${bytes.length} bytes.`,
);
