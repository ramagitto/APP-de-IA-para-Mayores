// Páginas del piloto web. HTML simple, sin frameworks (ADR 0006). La lógica vive en
// public/charla.js y el estilo en public/charla.css: la política de seguridad no deja correr
// scripts escritos dentro del HTML.

const THEME_COLOR = '#0b5d3b';
const BACKGROUND_COLOR = '#f7f4ee';

function head(extra: string): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${THEME_COLOR}">
<meta name="robots" content="noindex, nofollow">
<title>Charlá</title>
<link rel="icon" href="/app/icono.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/app/apple-touch-icon.png">
<link rel="stylesheet" href="/app/charla.css">
${extra}`;
}

// El token ya se validó (43 caracteres de base64url): se puede poner en el HTML sin escaparlo.
export function webPage(token: string): string {
  return `<!doctype html>
<html lang="es-AR">
<head>
${head(`<link rel="manifest" href="/p/${token}/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Charlá">
<script src="/app/charla.js" defer></script>`)}
</head>
<body>
<header class="top">
  <span class="brand">Charlá</span>
  <span id="streak" class="streak" hidden></span>
  <button type="button" id="menu-button" class="menu-button" aria-expanded="false" aria-controls="menu">Menú</button>
</header>
<nav id="menu" class="menu" hidden aria-label="Opciones">
  <button type="button" data-action="text-size">Cambiar el tamaño de la letra</button>
  <button type="button" data-action="install">Dejar Charlá en la pantalla de inicio</button>
  <button type="button" data-action="help">Pedir ayuda a una persona</button>
  <button type="button" data-action="leave" class="danger">Dejar el curso y borrar mis datos</button>
</nav>
<main id="main">
  <div id="chat" class="chat" role="log" aria-live="polite" aria-label="Conversación con Charlá"></div>
</main>
<footer class="controls">
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div id="choices" class="choices"></div>
  <div id="voice" class="voice" hidden>
    <button type="button" id="mic" class="mic">
      <span class="mic-icon" aria-hidden="true">🎤</span>
      <span id="mic-label">Tocá para hablar</span>
    </button>
    <button type="button" id="cancel-recording" class="secondary" hidden>Cancelar</button>
  </div>
  <button type="button" id="show-keyboard" class="link" hidden>Prefiero escribir</button>
  <form id="write" class="write" hidden>
    <label for="text">Escribí tu mensaje</label>
    <textarea id="text" rows="2" maxlength="1000" autocomplete="off"></textarea>
    <button type="submit" class="primary">Enviar</button>
  </form>
</footer>
<div id="dialog" class="dialog" hidden>
  <div class="dialog-box" role="dialog" aria-modal="true" aria-labelledby="dialog-text">
    <p id="dialog-text"></p>
    <div id="dialog-buttons" class="dialog-buttons"></div>
  </div>
</div>
<noscript><p class="status">Para usar Charlá hace falta activar JavaScript en el navegador.</p></noscript>
</body>
</html>
`;
}

export const NOT_FOUND_PAGE = `<!doctype html>
<html lang="es-AR">
<head>
${head('')}
</head>
<body>
<main class="gone">
  <h1>Este link no funciona</h1>
  <p>Puede ser que esté incompleto o que ya no se use.</p>
  <p>Si querés seguir con Charlá, pedile un link nuevo a la persona que te lo mandó.</p>
</main>
</body>
</html>
`;

// Manifiesto propio de cada persona: así, al dejarlo en la pantalla de inicio, abre su link.
export function manifestFor(token: string): string {
  const start = `/p/${token}`;

  return JSON.stringify({
    id: start,
    name: 'Charlá',
    short_name: 'Charlá',
    description: 'Lecciones cortas para aprender a usar la inteligencia artificial.',
    lang: 'es-AR',
    start_url: start,
    scope: start,
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: '/app/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/app/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  });
}
