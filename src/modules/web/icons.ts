import { crc32, deflateSync } from 'node:zlib';

// Ícono de la app: un globo de diálogo blanco con tres puntos, sobre el verde de Charlá. Se
// dibuja en código para no guardar imágenes binarias en el repositorio.
const GREEN: [number, number, number] = [0x0b, 0x5d, 0x3b];
const WHITE: [number, number, number] = [0xff, 0xff, 0xff];

export const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#0b5d3b"/>
<ellipse cx="50" cy="46" rx="32" ry="26" fill="#fff"/>
<polygon points="32,62 26,80 48,68" fill="#fff"/>
<circle cx="38" cy="46" r="4.5" fill="#0b5d3b"/>
<circle cx="50" cy="46" r="4.5" fill="#0b5d3b"/>
<circle cx="62" cy="46" r="4.5" fill="#0b5d3b"/>
</svg>`;

function insideTriangle(x: number, y: number): boolean {
  const [ax, ay, bx, by, cx, cy] = [0.32, 0.62, 0.26, 0.8, 0.48, 0.68];
  const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
  const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

// Mismo dibujo que el SVG, en coordenadas de 0 a 1.
function isWhite(x: number, y: number): boolean {
  const inBubble = ((x - 0.5) / 0.32) ** 2 + ((y - 0.46) / 0.26) ** 2 <= 1;
  const inDot = [0.38, 0.5, 0.62].some((dx) => (x - dx) ** 2 + (y - 0.46) ** 2 <= 0.045 ** 2);
  return (inBubble || insideTriangle(x, y)) && !inDot;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const cache = new Map<number, Buffer>();

/** PNG cuadrado del ícono, con bordes suavizados (4×4 muestras por píxel). */
export function appIconPng(size: number): Buffer {
  const cached = cache.get(size);
  if (cached) return cached;

  const samples = 4;
  const rows: Buffer[] = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      let white = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          if (isWhite(x, y)) white++;
        }
      }
      const share = white / samples ** 2;
      for (let channel = 0; channel < 3; channel++) {
        row[1 + px * 3 + channel] = Math.round(
          GREEN[channel]! * (1 - share) + WHITE[channel]! * share,
        );
      }
    }
    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 2; // color RGB, sin transparencia

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  cache.set(size, png);
  return png;
}
