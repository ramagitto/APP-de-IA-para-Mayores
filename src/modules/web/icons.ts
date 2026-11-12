import { crc32, deflateSync } from 'node:zlib';

// Ícono de la app: una persona que habla, en naranja sobre el verde petróleo de Charlá (los
// colores de la presentación). Se dibuja en código para no guardar imágenes binarias en el
// repositorio. Todo entra en la zona segura de los íconos "maskable".
const TEAL: [number, number, number] = [0x0d, 0x4d, 0x46];
const ORANGE: [number, number, number] = [0xf1, 0x8b, 0x38];

// Medidas en un cuadro de 100 × 100: cabeza, hombros y dos ondas de voz.
const HEAD = { cx: 45, cy: 36, r: 13 };
const BODY = { cx: 45, cy: 78, rx: 22, ry: 17 };
const WAVES = [22, 32];
const WAVE_HALF_WIDTH = 2.75;
const WAVE_ANGLE = (40 * Math.PI) / 180;

function waveEnds(radius: number): [number, number][] {
  const dx = radius * Math.cos(WAVE_ANGLE);
  const dy = radius * Math.sin(WAVE_ANGLE);
  return [
    [HEAD.cx + dx, HEAD.cy - dy],
    [HEAD.cx + dx, HEAD.cy + dy],
  ];
}

const round = (value: number) => Math.round(value * 100) / 100;

export const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#0d4d46"/>
<g fill="#f18b38">
<circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}"/>
<path d="M${BODY.cx - BODY.rx} ${BODY.cy}a${BODY.rx} ${BODY.ry} 0 0 1 ${BODY.rx * 2} 0z"/>
</g>
<g fill="none" stroke="#f18b38" stroke-width="${WAVE_HALF_WIDTH * 2}" stroke-linecap="round">
${WAVES.map((radius) => {
  const [[x1, y1], [x2, y2]] = waveEnds(radius) as [[number, number], [number, number]];
  return `<path d="M${round(x1)} ${round(y1)}A${radius} ${radius} 0 0 1 ${round(x2)} ${round(y2)}"/>`;
}).join('\n')}
</g>
</svg>`;

// Mismo dibujo que el SVG, en coordenadas de 0 a 100.
function isOrange(x: number, y: number): boolean {
  if ((x - HEAD.cx) ** 2 + (y - HEAD.cy) ** 2 <= HEAD.r ** 2) return true;
  if (y <= BODY.cy && ((x - BODY.cx) / BODY.rx) ** 2 + ((y - BODY.cy) / BODY.ry) ** 2 <= 1) {
    return true;
  }

  const distance = Math.hypot(x - HEAD.cx, y - HEAD.cy);
  const angle = Math.atan2(y - HEAD.cy, x - HEAD.cx);
  return WAVES.some(
    (radius) =>
      (Math.abs(distance - radius) <= WAVE_HALF_WIDTH && Math.abs(angle) <= WAVE_ANGLE) ||
      // Puntas redondeadas.
      waveEnds(radius).some(([ex, ey]) => (x - ex) ** 2 + (y - ey) ** 2 <= WAVE_HALF_WIDTH ** 2),
  );
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
      let orange = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          if (isOrange(x * 100, y * 100)) orange++;
        }
      }
      const share = orange / samples ** 2;
      for (let channel = 0; channel < 3; channel++) {
        row[1 + px * 3 + channel] = Math.round(
          TEAL[channel]! * (1 - share) + ORANGE[channel]! * share,
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
