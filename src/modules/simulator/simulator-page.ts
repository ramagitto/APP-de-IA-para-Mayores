// Página del simulador: imita una conversación de WhatsApp para desarrollar y hacer demos sin Meta.
// Es HTML, CSS y JavaScript simples, sin frameworks (ADR 0006). Letra grande y alto contraste.
export const SIMULATOR_PAGE = `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Charlá · Simulador</title>
<style>
  :root {
    --bg: #f4f1ea; --surface: #ffffff; --text: #1a1a1a; --muted: #4a4a4a;
    --charla: #ffffff; --person: #d9f2d0; --care: #fff1c2; --care-border: #8a5a00;
    --accent: #0b5d3b; --accent-text: #ffffff; --border: #b9b2a5; --focus: #1d4ed8;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #121212; --surface: #1e1e1e; --text: #f2f2f2; --muted: #c9c9c9;
      --charla: #262626; --person: #1f4d2e; --care: #4a3a10; --care-border: #ffd166;
      --accent: #5fd39a; --accent-text: #0b1f15; --border: #555; --focus: #93c5fd;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 20px/1.5 system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; min-height: 100vh; gap: 12px; }
  h1 { font-size: 1.4rem; margin: 0; }
  .notice { font-size: 0.85rem; color: var(--muted); margin: 0; }
  .status { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 0.9rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 8px 12px; }
  #chat { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
  .bubble { max-width: 85%; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--border); white-space: pre-wrap; overflow-wrap: anywhere; }
  .charla { align-self: flex-start; background: var(--charla); }
  .person { align-self: flex-end; background: var(--person); }
  .care { border: 2px solid var(--care-border); background: var(--care); }
  .label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 4px; }
  audio { display: block; width: 100%; margin-bottom: 6px; }
  form { display: flex; gap: 8px; align-items: flex-end; }
  textarea { flex: 1; min-height: 56px; font: inherit; padding: 10px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); resize: vertical; }
  button { font: inherit; min-height: 48px; padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; }
  button.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  button[aria-pressed="true"] { outline: 3px solid var(--care-border); }
  button:focus-visible, textarea:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  .tools { display: flex; flex-wrap: wrap; gap: 8px; }
  .error { color: #b00020; }
  @media (prefers-color-scheme: dark) { .error { color: #ff8a80; } }
</style>
</head>
<body>
<main>
  <h1>Charlá · Simulador</h1>
  <p class="notice">Solo para desarrollo y demos. Si el proveedor de voz es el simulado, el navegador reconoce y lee la voz, y algunos navegadores mandan el audio a servicios externos para hacerlo.</p>
  <div class="status" aria-live="polite">
    <span>Día simulado: <strong id="day">hoy</strong></span>
    <span>Lección: <strong id="lesson">—</strong></span>
    <span>Mensajes pagos: <strong id="paid">—</strong></span>
    <span>Racha: <strong id="streak">0</strong></span>
  </div>
  <div id="chat" role="log" aria-live="polite" aria-label="Conversación"></div>
  <p id="error" class="error" role="alert"></p>
  <form id="form">
    <label for="text" class="label" style="position:absolute;left:-9999px">Tu mensaje</label>
    <textarea id="text" placeholder="Escribí tu mensaje y apretá Enter"></textarea>
    <button type="button" id="mic" aria-pressed="false">🎤 Hablar</button>
    <button type="submit" class="primary">Enviar</button>
  </form>
  <div class="tools">
    <button type="button" id="next-day">Pasar al día siguiente</button>
    <button type="button" id="reset">Empezar de nuevo</button>
    <label><input type="checkbox" id="auto-speak" checked> Leer en voz alta las respuestas</label>
  </div>
</main>
<script>
(() => {
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  };
  let sessionId = storage.get('charla-session') || crypto.randomUUID();
  storage.set('charla-session', sessionId);
  let offset = Number(storage.get('charla-offset') || 0);

  const chat = document.getElementById('chat');
  const errorBox = document.getElementById('error');
  const textInput = document.getElementById('text');
  const micButton = document.getElementById('mic');
  const autoSpeak = document.getElementById('auto-speak');
  const labels = { intro: 'Lección', feedback: 'Tutor', challenge: 'Desafío', closing: 'Cierre', care: 'Mensaje de cuidado', info: 'Aviso' };

  function showDay() {
    const date = new Date(Date.now() + offset * 86400000);
    document.getElementById('day').textContent = offset === 0 ? 'hoy' : date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-AR';
    const voice = speechSynthesis.getVoices().find((v) => v.lang === 'es-AR') || speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  }

  function addBubble(who, text, options = {}) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + who + (options.kind === 'care' ? ' care' : '');
    if (options.kind) {
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = labels[options.kind] || options.kind;
      bubble.append(label);
    }
    if (options.audioUrl) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = options.audioUrl;
      bubble.append(audio);
    } else if (options.format === 'audio') {
      const play = document.createElement('button');
      play.type = 'button';
      play.textContent = '▶ Escuchar';
      play.addEventListener('click', () => speak(text));
      bubble.append(play);
    }
    const body = document.createElement('div');
    body.textContent = text;
    bubble.append(body);
    chat.append(bubble);
    bubble.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function showStatus(status) {
    document.getElementById('lesson').textContent = status.lessonId ? status.lessonId + ' (' + status.state + ')' : '—';
    document.getElementById('paid').textContent = status.paidMessagesUsed !== undefined ? status.paidMessagesUsed + ' de 5' : '—';
    document.getElementById('streak').textContent = status.streak;
  }

  async function send(payload) {
    errorBox.textContent = '';
    try {
      const response = await fetch('/simulador/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, clockOffsetDays: offset, ...payload }),
      });
      if (!response.ok) throw new Error('El servidor respondió ' + response.status);
      const data = await response.json();
      if (payload.audio) addBubble('person', data.transcript ? '🎤 ' + data.transcript : '🎤 (audio)');
      for (const message of data.messages) {
        addBubble('charla', message.text, message);
        if (autoSpeak.checked) {
          if (message.audioUrl) new Audio(message.audioUrl).play().catch(() => {});
          else if (message.format === 'audio') speak(message.text);
        }
      }
      showStatus(data.status);
    } catch (error) {
      errorBox.textContent = 'No se pudo enviar el mensaje. ' + error.message;
    }
  }

  document.getElementById('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    addBubble('person', text);
    textInput.value = '';
    send({ text });
  });

  textInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      document.getElementById('form').requestSubmit();
    }
  });

  // Micrófono: graba el audio y, si el navegador puede, también reconoce el texto.
  let recorder = null;
  let recognition = null;
  let recognized = '';
  let chunks = [];

  micButton.addEventListener('click', async () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      if (recognition) recognition.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recognized = '';
      recorder.addEventListener('dataavailable', (event) => chunks.push(event.data));
      recorder.addEventListener('stop', async () => {
        stream.getTracks().forEach((track) => track.stop());
        micButton.textContent = '🎤 Hablar';
        micButton.setAttribute('aria-pressed', 'false');
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        // Damos un instante para que el reconocimiento entregue su último resultado.
        setTimeout(() => send({ audio: { base64, mimeType: blob.type || 'audio/webm', hintText: recognized || undefined } }), 400);
      });
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        recognition = new Recognition();
        recognition.lang = 'es-AR';
        recognition.continuous = true;
        recognition.addEventListener('result', (event) => {
          recognized = Array.from(event.results).map((result) => result[0].transcript).join(' ');
        });
        recognition.start();
      }
      recorder.start();
      micButton.textContent = '⏹ Terminar';
      micButton.setAttribute('aria-pressed', 'true');
    } catch (error) {
      errorBox.textContent = 'No se pudo usar el micrófono. ' + error.message;
    }
  });

  document.getElementById('next-day').addEventListener('click', () => {
    offset += 1;
    storage.set('charla-offset', String(offset));
    showDay();
    addBubble('charla', 'Pasó un día. Escribí cualquier cosa para seguir.', { kind: 'info' });
  });

  document.getElementById('reset').addEventListener('click', async () => {
    await fetch('/simulador/reiniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    sessionId = crypto.randomUUID();
    storage.set('charla-session', sessionId);
    offset = 0;
    storage.set('charla-offset', '0');
    chat.replaceChildren();
    showDay();
    showStatus({ streak: 0 });
  });

  showDay();
})();
</script>
</body>
</html>
`;
