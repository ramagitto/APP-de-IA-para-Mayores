// Páginas del piloto web. HTML simple, sin frameworks (ADR 0006). La lógica vive en
// public/charla.js y el estilo en public/charla.css: la política de seguridad no deja correr
// scripts escritos dentro del HTML.

const THEME_COLOR = '#0d4d46';
const BACKGROUND_COLOR = '#f4f7f6';

// `version` cambia cuando cambia el estilo, el script o el ícono. Va en cada URL para que el
// navegador no mezcle una página nueva con archivos viejos que tenía guardados.
function head(extra: string, version: string): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${THEME_COLOR}">
<meta name="robots" content="noindex, nofollow">
<title>Charlá</title>
<link rel="icon" href="/app/icono.svg?v=${version}" type="image/svg+xml">
<link rel="apple-touch-icon" href="/app/apple-touch-icon.png?v=${version}">
<link rel="preload" href="/app/atkinson-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/app/charla.css?v=${version}">
${extra}`;
}

// Íconos de trazo, al estilo de Lucide (licencia ISC). Se usan con <use href="#i-...">: así no
// dependen de los emojis, que cambian de un celular a otro.
const ICONS = `<svg xmlns="http://www.w3.org/2000/svg" hidden>
<symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></symbol>
<symbol id="i-stop" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></symbol>
<symbol id="i-keyboard" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h4M18 13h.01M8 16h8"/></symbol>
<symbol id="i-speaker" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
<symbol id="i-text" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></symbol>
<symbol id="i-people" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></symbol>
<symbol id="i-leave" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
<symbol id="i-flame" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/></symbol>
<symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></symbol>
</svg>`;

// La marca: una persona que habla, como en el ícono de la app y en la presentación.
const LOGO = `<svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" class="logo-bg"/><g class="logo-fg"><circle cx="45" cy="36" r="13"/><path d="M23 78a22 17 0 0 1 44 0z"/></g><g class="logo-waves"><path d="M61.85 21.86A22 22 0 0 1 61.85 50.14"/><path d="M69.51 15.43A32 32 0 0 1 69.51 56.57"/></g></svg>`;

const icon = (name: string) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// El token ya se validó (43 caracteres de base64url): se puede poner en el HTML sin escaparlo.
// Hay una pantalla por momento del curso; charla.js muestra la que corresponde.
export function webPage(token: string, version: string): string {
  return `<!doctype html>
<html lang="es-AR">
<head>
${head(
  `<link rel="manifest" href="/p/${token}/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Charlá">
<script src="/app/charla.js?v=${version}" defer></script>`,
  version,
)}
</head>
<body>
${ICONS}
<header class="top">
  <div class="brand">${LOGO}<span>Charlá</span></div>
  <button type="button" id="menu-button" class="menu-button" aria-expanded="false" aria-controls="menu">${icon('menu')}<span>Menú</span></button>
</header>

<main id="main">
  <p id="loading" class="loading" role="status">Abriendo Charlá…</p>

  <section id="screen-welcome" class="screen welcome" hidden aria-labelledby="welcome-title">
    <div class="hero">${LOGO}</div>
    <h1 id="welcome-title">Aprendé a usar la inteligencia artificial, de a poquito</h1>
    <ul class="features">
      <li><span class="feature-icon">${icon('clock')}</span>
        <div><strong>Una lección corta por día</strong><span>Unos 3 minutos, de lunes a viernes.</span></div></li>
      <li><span class="feature-icon">${icon('mic')}</span>
        <div><strong>Hablás o escribís</strong><span>Como en WhatsApp. No hace falta saber nada antes.</span></div></li>
      <li><span class="feature-icon">${icon('shield')}</span>
        <div><strong>Sin riesgos</strong><span>Nunca te vamos a pedir claves, códigos ni datos de tus cuentas.</span></div></li>
    </ul>
    <p class="fineprint">Un proyecto de estudiantes de Ingeniería en Informática de la USAL.</p>
  </section>

  <section id="screen-consent" class="screen" hidden aria-labelledby="consent-title">
    <p class="eyebrow">Antes de empezar</p>
    <h1 id="consent-title">Necesito tu permiso</h1>
    <p class="lead">Leelo con calma. Si preferís, tocá «Escuchar».</p>
    <article class="card prose">
      <button type="button" id="consent-listen" class="pill">${icon('speaker')}Escuchar</button>
      <div id="consent-text" class="paras"></div>
    </article>
  </section>

  <section id="screen-home" class="screen" hidden aria-labelledby="home-title">
    <h1 id="home-title"></h1>
    <div id="notice" class="notice" hidden role="status"></div>
    <article id="today" class="card today"></article>
    <article class="card progress" aria-labelledby="progress-title">
      <h2 id="progress-title">Tu avance</h2>
      <ol id="progress-dots" class="dots"></ol>
      <p id="progress-text" class="progress-text"></p>
      <p id="streak" class="streak" hidden>${icon('flame')}<span></span></p>
    </article>
    <p class="tip">${icon('shield')}<span>Charlá nunca te pide claves ni códigos. Si alguien te los pide, desconfiá.</span></p>
  </section>

  <section id="screen-lesson" class="screen lesson" hidden aria-labelledby="lesson-title">
    <div class="lesson-head">
      <p id="lesson-number" class="eyebrow"></p>
      <h1 id="lesson-title"></h1>
      <ol class="steps" aria-label="Pasos de la lección">
        <li id="step-practice"><span class="step-dot">1</span>Practicar</li>
        <li id="step-challenge"><span class="step-dot">2</span>Desafío</li>
      </ol>
    </div>
    <div id="chat" class="chat" role="log" aria-live="polite" aria-label="Conversación con Charlá"></div>
  </section>

  <section id="screen-done" class="screen done" hidden aria-labelledby="done-title">
    <div class="burst" aria-hidden="true">${icon('check')}</div>
    <h1 id="done-title"></h1>
    <article id="done-message" class="card prose" hidden></article>
    <article class="card progress">
      <ol id="done-dots" class="dots"></ol>
      <p id="done-progress" class="progress-text"></p>
      <p id="done-streak" class="streak" hidden>${icon('flame')}<span></span></p>
    </article>
  </section>

  <section id="screen-end" class="screen end" hidden aria-labelledby="end-title">
    <div class="hero">${LOGO}</div>
    <h1 id="end-title"></h1>
    <p id="end-text" class="lead"></p>
  </section>
</main>

<footer id="controls" class="controls" hidden>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div id="choices" class="choices"></div>
  <div id="voice" class="voice" hidden>
    <button type="button" id="mic" class="mic" aria-pressed="false">
      <span class="mic-circle"><svg class="icon" aria-hidden="true"><use id="mic-icon" href="#i-mic"/></svg></span>
      <span id="mic-label">Tocá para hablar</span>
    </button>
    <div class="voice-links">
      <button type="button" id="cancel-recording" class="link" hidden>Cancelar</button>
      <button type="button" id="show-keyboard" class="link">${icon('keyboard')}Prefiero escribir</button>
    </div>
  </div>
  <form id="write" class="write" hidden>
    <label for="text">Escribí tu mensaje</label>
    <div class="write-row">
      <textarea id="text" rows="2" maxlength="1000" autocomplete="off"></textarea>
      <button type="submit" class="send" aria-label="Enviar">${icon('send')}</button>
    </div>
    <button type="button" id="show-voice" class="link" hidden>${icon('mic')}Mejor hablo</button>
  </form>
</footer>

<div id="menu" class="sheet" hidden>
  <div class="sheet-box" role="dialog" aria-modal="true" aria-labelledby="menu-title">
    <div class="sheet-head">
      <h2 id="menu-title">Menú</h2>
      <button type="button" class="icon-button" data-action="close" aria-label="Cerrar el menú">${icon('close')}</button>
    </div>
    <div class="size-picker" role="group" aria-labelledby="size-title">
      <p id="size-title">${icon('text')}Tamaño de la letra</p>
      <div class="sizes">
        <button type="button" data-size="normal" aria-pressed="false"><span class="size-a">A</span>Normal</button>
        <button type="button" data-size="grande" aria-pressed="false"><span class="size-a">A</span>Grande</button>
        <button type="button" data-size="enorme" aria-pressed="false"><span class="size-a">A</span>Enorme</button>
      </div>
    </div>
    <button type="button" class="menu-item" data-action="install">${icon('phone')}Dejar Charlá en la pantalla de inicio</button>
    <button type="button" class="menu-item" data-action="help">${icon('people')}Pedir ayuda a una persona</button>
    <button type="button" class="menu-item danger" data-action="leave">${icon('leave')}Dejar el curso y borrar mis datos</button>
  </div>
</div>

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

export function notFoundPage(version: string): string {
  return `<!doctype html>
<html lang="es-AR">
<head>
${head('', version)}
</head>
<body>
<main class="screen end">
  <div class="hero">${LOGO}</div>
  <h1>Este link no funciona</h1>
  <p class="lead">Puede ser que esté incompleto o que ya no se use.</p>
  <p class="lead">Si querés seguir con Charlá, pedile un link nuevo a la persona que te lo mandó.</p>
</main>
</body>
</html>
`;
}

// Manifiesto propio de cada persona: así, al dejarlo en la pantalla de inicio, abre su link.
export function manifestFor(token: string, version: string): string {
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
      { src: `/app/icono-192.png?v=${version}`, sizes: '192x192', type: 'image/png' },
      { src: `/app/icono-512.png?v=${version}`, sizes: '512x512', type: 'image/png' },
      {
        src: `/app/icono-512.png?v=${version}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  });
}
