// Charlá: app web del piloto, sin frameworks ni dependencias.
// Probada en el diseño para Chrome de Android y Safari de iPhone (iOS 14.3 o más nuevo):
// - el micrófono pide permiso recién cuando la persona toca "hablar";
// - se graba en WebM/Opus (Android) o MP4/AAC (iPhone), según lo que acepte el navegador;
// - el iPhone no reproduce audio solo si no hubo un toque antes: el primer toque "destraba" el
//   reproductor, y después se reutiliza el mismo para cada audio.
//
// Hay una pantalla por momento del curso: bienvenida, permiso, inicio (la lección del día y el
// avance), la lección (una conversación corta), el festejo al terminarla y la despedida. El
// servidor dice en qué momento está la persona; esta página solo elige qué mostrar.
(() => {
  'use strict';

  const token = location.pathname.split('/')[2] || '';
  const base = `/p/${token}`;
  // Un mismo celular puede tener más de un participante: el historial se separa por link. Solo
  // guarda la conversación de la lección en curso.
  const historyKey = `charla-historial-${token.slice(0, 10)}`;
  const MAX_HISTORY = 60;
  const MAX_RECORDING_SECONDS = 120;
  const SIZES = ['normal', 'grande', 'enorme'];

  const $ = (id) => document.getElementById(id);
  const chat = $('chat');
  const controls = $('controls');
  const statusBox = $('status');
  const choices = $('choices');
  const voiceBox = $('voice');
  const micButton = $('mic');
  const micLabel = $('mic-label');
  const micIcon = $('mic-icon');
  const cancelButton = $('cancel-recording');
  const keyboardButton = $('show-keyboard');
  const voiceButton = $('show-voice');
  const writeForm = $('write');
  const textInput = $('text');
  const menu = $('menu');
  const menuButton = $('menu-button');

  // 'sponsor' existe solo en la página de un participante demo.
  const SCREENS = ['welcome', 'consent', 'home', 'lesson', 'done', 'end', 'sponsor'];

  // Etiqueta e ícono de cada tipo de mensaje de Charlá. Los demás van sin etiqueta.
  const LABELS = {
    intro: ['book', 'La lección de hoy'],
    challenge: ['target', 'Desafío'],
    care: ['alert', 'Importante'],
  };

  const storage = {
    get(key) {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Sin espacio o en modo privado: la app sigue funcionando sin historial.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Nada que hacer.
      }
    },
  };

  let history = storage.get(historyKey) || [];
  let state = null;
  let screen = null;
  let voiceInput = 'off';
  let preferKeyboard = false;
  let busy = false;
  let lastStateAt = 0;
  let installPrompt = null;
  // El aviso de bienvenida que se muestra una vez en el inicio, después de aceptar.
  let notice = '';

  // ---------- Elementos ----------

  function svgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${name}`);
    svg.append(use);
    return svg;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(text, className, onClick, iconName) {
    const node = element('button', className);
    node.type = 'button';
    if (iconName) node.append(svgIcon(iconName));
    node.append(text);
    node.addEventListener('click', onClick);
    return node;
  }

  // Un texto con varios párrafos: cada uno en su <p>, para que respire.
  function paragraphs(container, text) {
    container.replaceChildren(
      ...String(text)
        .split(/\n+/)
        .filter((line) => line.trim())
        .map((line) => element('p', '', line.trim())),
    );
  }

  // ---------- Tamaño de letra ----------

  function applySize(size) {
    document.documentElement.dataset.size = size;
    document.querySelectorAll('[data-size]').forEach((node) => {
      if (node.tagName === 'BUTTON')
        node.setAttribute('aria-pressed', String(node.dataset.size === size));
    });
  }
  applySize(SIZES.includes(storage.get('charla-letra')) ? storage.get('charla-letra') : 'normal');

  // ---------- Pantallas ----------

  function show(name) {
    screen = name;
    $('loading').hidden = true;
    for (const each of SCREENS) {
      const node = $(`screen-${each}`);
      if (node) node.hidden = each !== name;
    }
    controls.hidden = name === 'end';
    showStatus('');
    if (name !== 'lesson') window.scrollTo(0, 0);
  }

  // Lo que va abajo: botones, micrófono o teclado.
  function setControls(items, talk) {
    choices.replaceChildren(...items);
    showVoice(Boolean(talk));
    controls.hidden = items.length === 0 && !talk;
  }

  function showWelcome() {
    show('welcome');
    setControls([
      button('Empezar', 'primary', () => {
        unlockAudio();
        send({ text: 'Hola' });
      }),
    ]);
  }

  function showConsent(text) {
    show('consent');
    paragraphs($('consent-text'), text || '');
    setControls([
      button('Acepto', 'primary', () => {
        unlockAudio();
        stopPlayback();
        send({ text: 'ACEPTO' });
      }),
      button('No, gracias', 'secondary', () => {
        stopPlayback();
        send({ text: 'NO' });
      }),
    ]);
  }

  $('consent-listen').addEventListener('click', () => {
    unlockAudio();
    playNow({ text: $('consent-text').textContent });
  });

  function greeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '¡Buen día!';
    if (hour >= 12 && hour < 20) return '¡Buenas tardes!';
    return '¡Buenas noches!';
  }

  function renderProgress(dots, text, streakBox, next) {
    const progress = next.progress || { completed: 0, total: 0 };
    const current = next.lesson && next.lesson.kind === 'ready' ? progress.completed : -1;
    dots.replaceChildren(
      ...Array.from({ length: progress.total }, (_, index) => {
        const dot = element(
          'li',
          index < progress.completed ? 'done' : index === current ? 'current' : '',
        );
        dot.setAttribute('aria-hidden', 'true');
        return dot;
      }),
    );
    text.textContent =
      progress.completed === 1
        ? `1 de ${progress.total} lecciones hechas`
        : `${progress.completed} de ${progress.total} lecciones hechas`;

    streakBox.hidden = !(next.streak > 0);
    streakBox.querySelector('span').textContent =
      next.streak === 1 ? 'Empezaste tu racha' : `${next.streak} lecciones seguidas`;
  }

  function showHome() {
    show('home');
    $('home-title').textContent = greeting();
    $('notice').hidden = !notice;
    $('notice').textContent = notice;
    notice = '';

    const today = $('today');
    const lesson = state.lesson || { kind: 'done_today' };
    const progress = state.progress || { completed: 0, total: 0 };

    if (lesson.kind === 'ready') {
      today.className = 'card today';
      const meta = element('p', 'meta');
      meta.append(svgIcon('clock'), 'Unos 3 minutos');
      today.replaceChildren(
        element('p', 'eyebrow', `Lección ${lesson.lessonNumber} de ${progress.total}`),
        element('h2', '', lesson.lessonTitle),
        meta,
      );
      setControls([
        button(
          'Empezar la lección',
          'primary',
          () => {
            unlockAudio();
            history = [];
            storage.set(historyKey, history);
            send({ text: 'Empezar la lección' });
          },
          'arrow',
        ),
      ]);
    } else {
      today.className = 'card today rest';
      const check = element('span', 'check');
      check.append(svgIcon('check'));
      const allDone = lesson.kind === 'all_done';
      today.replaceChildren(
        check,
        element(
          'h2',
          '',
          allDone ? '¡Terminaste todas las lecciones!' : '¡Ya hiciste la lección de hoy!',
        ),
        element(
          'p',
          '',
          allDone
            ? 'Muy pronto vamos a sumar más. ¡Felicitaciones!'
            : 'La próxima te espera el próximo día de semana.',
        ),
      );
      setControls([]);
    }

    renderProgress($('progress-dots'), $('progress-text'), $('streak'), state);
  }

  function showLesson(lesson, messages) {
    const starting = screen !== 'lesson';
    if (starting) {
      show('lesson');
      chat.replaceChildren();
      history.forEach(renderBubble);
    }
    $('lesson-number').textContent = `Lección ${lesson.lessonNumber}`;
    $('lesson-title').textContent = lesson.lessonTitle;
    const challenge = lesson.step === 'challenge';
    $('step-practice').className = challenge ? 'complete' : 'active';
    $('step-challenge').className = challenge ? 'active' : '';

    // Si se abre la lección en otro celular (sin historial), al menos se ve la consigna.
    if (history.length === 0 && messages.length === 0 && lesson.prompt) {
      addEntry({
        who: 'charla',
        kind: challenge ? 'challenge' : 'intro',
        format: 'audio',
        text: lesson.prompt,
      });
    }

    if (challenge) {
      setControls([
        button('Sí, lo hice', 'primary', () => quickReply('Sí, lo hice'), 'check'),
        button('Todavía no pude', 'secondary', () => quickReply('No pude')),
      ]);
    } else {
      setControls([], true);
    }
    // Al empezar, se ve la lección desde arriba, con su título. Después, cada respuesta nueva se
    // muestra desde su primera línea.
    messages.forEach((entry, index) => {
      const bubble = addEntry(entry);
      if (index === 0 && !starting) scrollToStart(bubble);
    });
    if (starting) window.scrollTo(0, 0);
  }

  function quickReply(text) {
    unlockAudio();
    send({ text }, text === 'No pude' ? 'Todavía no pude' : text);
  }

  function showDone(finished, closing) {
    show('done');
    $('done-title').textContent = finished
      ? `¡Muy bien! Terminaste la lección\u00a0${finished}`
      : '¡Muy bien! Terminaste la lección';
    const box = $('done-message');
    box.hidden = closing.length === 0;
    box.replaceChildren();
    for (const entry of closing) {
      const text = element('div', 'paras');
      paragraphs(text, entry.text);
      box.append(text);
      if (entry.format === 'audio') box.append(listenButton(entry));
    }
    renderProgress($('done-dots'), $('done-progress'), $('done-streak'), state);
    history = [];
    storage.remove(historyKey);
    setControls([button('Volver al inicio', 'primary', showHome)]);
  }

  function showEnd(title, text) {
    stopPlayback();
    storage.remove(historyKey);
    menuButton.hidden = true;
    menu.hidden = true;
    show('end');
    $('end-title').textContent = title;
    $('end-text').textContent = text;
  }

  // Elige la pantalla según lo que dice el servidor. Si la persona venía de una lección y ya no
  // está en una, la acaba de terminar: festejo.
  function applyState(next, fresh) {
    const previous = state;
    state = next;
    const messages = fresh || [];

    if (next.phase === 'welcome') {
      showWelcome();
      if (messages.length) showMessages(messages);
      return;
    }
    if (next.phase === 'consent') return showConsent(next.consentText);

    const lesson = next.lesson || { kind: 'done_today' };
    if (lesson.kind === 'in_lesson') return showLesson(lesson, messages);

    const wasInLesson = previous && previous.lesson && previous.lesson.kind === 'in_lesson';
    if (wasInLesson && screen === 'lesson') {
      return showDone(previous.lesson.lessonNumber, messages);
    }

    if (previous && previous.phase === 'consent' && messages.length) {
      notice = messages.map((entry) => entry.text).join('\n');
      return showHome();
    }
    showHome();
    if (messages.length) showMessages(messages);
  }

  // Fuera de la lección, una respuesta de Charlá (por ejemplo, la de "Pedir ayuda") se muestra
  // en un cartel.
  function showMessages(messages) {
    showDialog(messages.map((entry) => entry.text).join('\n\n'), [['Entendido', 'primary']]);
  }

  // ---------- Mensajes de la lección ----------

  function scrollToStart(node) {
    requestAnimationFrame(() => node.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  function scrollToEnd(node) {
    requestAnimationFrame(() => node.scrollIntoView({ block: 'end', behavior: 'smooth' }));
  }

  function listenButton(entry) {
    return button(
      'Escuchar',
      'pill',
      () => {
        unlockAudio();
        playNow(entry);
      },
      'speaker',
    );
  }

  function renderBubble(entry) {
    const bubble = element('div', `bubble ${entry.who}`);
    if (entry.who === 'charla' && LABELS[entry.kind]) {
      const [iconName, text] = LABELS[entry.kind];
      bubble.classList.add(entry.kind);
      const label = element('span', 'label');
      label.append(svgIcon(iconName), text);
      bubble.append(label);
    }
    bubble.append(element('div', '', entry.text));
    if (entry.who === 'charla' && entry.format === 'audio') bubble.append(listenButton(entry));
    chat.append(bubble);
    return bubble;
  }

  function addEntry(entry) {
    history.push(entry);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    storage.set(historyKey, history);
    return renderBubble(entry);
  }

  function showStatus(text, isError) {
    statusBox.textContent = text || '';
    statusBox.classList.toggle('error', Boolean(isError));
  }

  let thinkingBubble = null;
  function showThinking(text) {
    hideThinking();
    if (screen !== 'lesson') return showStatus(text);
    thinkingBubble = element('div', 'bubble charla typing');
    thinkingBubble.setAttribute('role', 'status');
    thinkingBubble.append(element('span'), element('span'), element('span'));
    thinkingBubble.append(element('span', 'typing-text', text));
    // Los puntitos son la animación; el texto queda solo si tarda.
    thinkingBubble.querySelectorAll('span')[3].hidden = !text.includes('despertando');
    chat.append(thinkingBubble);
    scrollToEnd(thinkingBubble);
  }
  function hideThinking() {
    if (thinkingBubble) thinkingBubble.remove();
    thinkingBubble = null;
    if (screen !== 'lesson') showStatus('');
  }

  // ---------- Audio de Charlá ----------

  const player = new Audio();
  player.preload = 'auto';
  let unlocked = false;
  let queue = [];
  let playing = null;

  // Un WAV de silencio armado en el momento: alcanza para destrabar el reproductor del iPhone.
  function silentWavUrl() {
    const samples = 800;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const write = (offset, text) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples * 2, true);
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  }

  // Se llama dentro de cada toque. La primera vez, destraba el audio y la voz del navegador.
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    player.src = silentWavUrl();
    player.play().catch(() => {});
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0;
      speechSynthesis.speak(utterance);
    }
  }

  // Solo pausa si suena un mensaje: pausar el silencio del destrabe podría volver a trabarlo.
  function stopPlayback() {
    const wasPlaying = Boolean(playing);
    queue = [];
    playing = null;
    if (!wasPlaying) return;
    player.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  // Sin audio generado (voz simulada), lee el texto la voz del navegador.
  function speakWithBrowser(text, onEnd) {
    if (!('speechSynthesis' in window)) return onEnd();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-AR';
    utterance.rate = 0.95;
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === 'es-AR') ||
      voices.find((v) => v.lang === 'es-US' || v.lang === 'es-MX') ||
      voices.find((v) => v.lang.startsWith('es'));
    if (voice) utterance.voice = voice;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    speechSynthesis.speak(utterance);
  }

  function playNext() {
    const entry = queue.shift();
    playing = entry || null;
    if (!entry) return;

    if (entry.audioUrl) {
      player.src = entry.audioUrl;
      player.onended = playNext;
      player.onerror = playNext;
      player.play().catch(() => {
        // El navegador no dejó reproducir solo: queda el botón "Escuchar".
        queue = [];
        playing = null;
      });
    } else {
      speakWithBrowser(entry.text, playNext);
    }
  }

  function playNow(entry) {
    stopPlayback();
    queue = [entry];
    playNext();
  }

  function enqueue(entries) {
    queue = queue.concat(entries);
    if (!playing) playNext();
  }

  // ---------- Hablar con el servidor ----------

  async function request(path, options) {
    const response = await fetch(base + path, {
      cache: 'no-store',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
    });
    if (response.status === 404) {
      showGone();
      throw new Error('gone');
    }
    if (response.status === 429)
      throw new Error('Mandaste muchos mensajes seguidos. Esperá un minutito.');
    if (response.status === 409) throw new Error((await response.json()).error || '');
    if (!response.ok) throw new Error('');
    return response.json();
  }

  async function send(payload, shownText, path) {
    if (busy) return;
    busy = true;
    setEnabled(false);
    showStatus('');
    stopPlayback();

    if (shownText && screen === 'lesson') scrollToEnd(addEntry({ who: 'person', text: shownText }));
    showThinking('Un momentito…');
    // El servidor gratuito se duerme si nadie lo usa: la primera vez puede tardar casi un minuto.
    const slow = setTimeout(
      () =>
        showThinking(
          'Charlá se está despertando. La primera vez del día puede tardar hasta un minuto…',
        ),
      6000,
    );

    try {
      const data = await request(path || '/mensajes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      hideThinking();

      if (payload.audio) {
        scrollToEnd(
          addEntry({
            who: 'person',
            text: data.transcript ? `«${data.transcript}»` : 'Audio enviado',
          }),
        );
      }

      const fresh = data.messages.map((message) => ({
        who: 'charla',
        kind: message.kind,
        format: message.format,
        text: message.text,
        audioUrl: message.audioUrl,
      }));

      if (data.forgotten) return showFarewell();
      busy = false;
      if (data.state) applyState(data.state, fresh);
      else refreshState();
      enqueue(fresh.filter((entry) => entry.format === 'audio'));
    } catch (error) {
      hideThinking();
      if (error.message === 'gone') return;
      showStatus(
        error.message || 'No me llegó tu mensaje. Revisá que tengas internet y probá de nuevo.',
        true,
      );
      offerRetry(payload, path);
    } finally {
      clearTimeout(slow);
      busy = false;
      setEnabled(true);
    }
  }

  function offerRetry(payload, path) {
    const retry = button('Probar de nuevo', 'primary', () => {
      unlockAudio();
      send(payload, undefined, path);
    });
    choices.replaceChildren(retry);
    controls.hidden = false;
  }

  async function refreshState() {
    try {
      const data = await request('/estado');
      voiceInput = data.voiceInput;
      lastStateAt = Date.now();
      applyState(data);
    } catch (error) {
      if (error.message === 'gone') return;
      $('loading').hidden = true;
      showStatus('No me pude conectar. Revisá que tengas internet.', true);
      choices.replaceChildren(button('Probar de nuevo', 'primary', refreshState));
      controls.hidden = false;
    }
  }

  function setEnabled(enabled) {
    document
      .querySelectorAll('.controls button, .controls textarea, .sheet button')
      .forEach((node) => {
        if (node !== micButton && node !== cancelButton) node.disabled = !enabled;
      });
    micButton.disabled = !enabled && !isRecording();
  }

  // ---------- Hablar o escribir ----------

  function showVoice(show) {
    const canTalk = show && voiceInput !== 'off';
    const keyboard = show && (!canTalk || preferKeyboard);
    voiceBox.hidden = !canTalk || keyboard;
    writeForm.hidden = !keyboard;
    voiceButton.hidden = !canTalk;
  }

  function openKeyboard() {
    preferKeyboard = true;
    showVoice(true);
    textInput.focus();
  }

  keyboardButton.addEventListener('click', openKeyboard);
  voiceButton.addEventListener('click', () => {
    preferKeyboard = false;
    showVoice(true);
  });

  writeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    unlockAudio();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    send({ text }, text);
  });

  // ---------- Micrófono ----------

  let recorder = null;
  let stream = null;
  let chunks = [];
  let startedAt = 0;
  let timer = null;
  let cancelled = false;
  let recognition = null;
  let recognized = '';

  function isRecording() {
    return Boolean(recorder && recorder.state === 'recording');
  }

  function pickMimeType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function micHelp(error) {
    const name = error && error.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return (
        'Charlá necesita permiso para usar el micrófono.\n\n' +
        'En Android: tocá el candado o los ajustes al lado de la dirección, entrá en Permisos y activá el Micrófono.\n\n' +
        'En iPhone: tocá "aA" en la barra de la dirección, entrá en Configuración del sitio web y en Micrófono elegí Permitir.\n\n' +
        'Mientras tanto, podés escribir tu mensaje.'
      );
    }
    if (name === 'NotFoundError')
      return 'No encontré un micrófono en este celular. Podés escribir tu mensaje.';
    return 'No pude usar el micrófono. Podés escribir tu mensaje.';
  }

  function setRecordingUi(recording) {
    micButton.classList.toggle('recording', recording);
    micButton.setAttribute('aria-pressed', String(recording));
    micIcon.setAttribute('href', recording ? '#i-stop' : '#i-mic');
    cancelButton.hidden = !recording;
    keyboardButton.hidden = recording;
    micLabel.textContent = recording ? 'Te escucho… Tocá para enviar' : 'Tocá para hablar';
  }

  function updateTimer() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    if (seconds >= MAX_RECORDING_SECONDS) return stopRecording(false);
    const left = MAX_RECORDING_SECONDS - seconds;
    showStatus(left <= 20 ? `Quedan ${left} segundos de audio.` : '');
  }

  async function startRecording() {
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !window.MediaRecorder
    ) {
      openKeyboard();
      return showDialog('Este navegador no deja grabar audio. Podés escribir tu mensaje.', [
        ['Entendido', 'primary'],
      ]);
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      openKeyboard();
      return showDialog(micHelp(error), [['Entendido', 'primary']]);
    }

    const mimeType = pickMimeType();
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    chunks = [];
    cancelled = false;
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('stop', onRecordingStopped);
    recorder.start();
    startedAt = Date.now();
    timer = setInterval(updateTimer, 500);
    setRecordingUi(true);
    startRecognition();
  }

  // Solo en local, con la voz simulada: el navegador reconoce el texto. En el piloto, nunca.
  function startRecognition() {
    recognized = '';
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (voiceInput !== 'browser' || !Recognition) return;
    recognition = new Recognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true;
    recognition.addEventListener('result', (event) => {
      recognized = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ');
    });
    try {
      recognition.start();
    } catch {
      recognition = null;
    }
  }

  function stopRecording(cancel) {
    cancelled = cancel;
    clearInterval(timer);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    if (recognition) recognition.stop();
    recognition = null;
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function onRecordingStopped() {
    // Se apaga el micrófono enseguida: el celular deja de mostrar que está grabando.
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    setRecordingUi(false);
    showStatus('');
    if (cancelled) return;

    const seconds = (Date.now() - startedAt) / 1000;
    const type = (recorder && recorder.mimeType) || (chunks[0] && chunks[0].type) || 'audio/mp4';
    const blob = new Blob(chunks, { type });
    if (seconds < 1 || blob.size < 1000) {
      return showStatus(
        'El audio quedó muy cortito. Tocá el botón, hablá, y tocá de nuevo para enviarlo.',
      );
    }

    // Damos un instante para que el reconocimiento del navegador (solo en local) termine.
    await new Promise((resolve) => setTimeout(resolve, voiceInput === 'browser' ? 400 : 0));
    const base64 = await blobToBase64(blob);
    send({ audio: { base64, mimeType: type, hintText: recognized || undefined } });
  }

  micButton.addEventListener('click', () => {
    unlockAudio();
    if (isRecording()) return stopRecording(false);
    stopPlayback();
    startRecording();
  });

  cancelButton.addEventListener('click', () => stopRecording(true));

  // ---------- Diálogos y menú ----------

  function showDialog(text, buttons) {
    const dialog = $('dialog');
    const box = $('dialog-buttons');
    $('dialog-text').textContent = text;
    const previous = document.activeElement;
    const close = () => {
      dialog.hidden = true;
      if (previous && previous.focus) previous.focus();
    };
    box.replaceChildren(
      ...buttons.map(([label, className, action]) =>
        button(label, className || 'secondary', () => {
          close();
          if (action) action();
        }),
      ),
    );
    dialog.hidden = false;
    box.firstChild.focus();
  }

  function openMenu() {
    menu.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menu.querySelector('[data-action="close"]').focus();
  }

  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.focus();
  }

  menuButton.addEventListener('click', openMenu);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) closeMenu();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    // Android: guardamos el aviso para ofrecerlo desde el menú, cuando la persona quiera.
    event.preventDefault();
    installPrompt = event;
  });

  const actions = {
    close: closeMenu,
    install: () => {
      closeMenu();
      if (installPrompt) {
        installPrompt.prompt();
        installPrompt = null;
        return;
      }
      showDialog(
        'Para tener Charlá a mano, como una app:\n\n' +
          'En Android (Chrome): tocá los tres puntitos de arriba a la derecha y elegí "Agregar a la pantalla principal" o "Instalar app".\n\n' +
          'En iPhone (Safari): tocá el botón Compartir (el cuadrado con una flecha para arriba) y elegí "Agregar a inicio".',
        [['Entendido', 'primary']],
      );
    },
    help: () => {
      closeMenu();
      showDialog('¿Querés que una persona del equipo te escriba por WhatsApp?', [
        [
          'Sí, que me escriban',
          'primary',
          () => send({ text: 'AYUDA' }, 'Quiero hablar con una persona'),
        ],
        ['No, gracias'],
      ]);
    },
    leave: () => {
      closeMenu();
      showDialog(
        '¿Seguro que querés dejar el curso?\n\nVamos a borrar todos tus datos y este link va a dejar de funcionar.',
        [
          ['No, quiero seguir', 'primary'],
          [
            'Sí, borrar mis datos',
            'danger-button',
            () => send({ text: 'BAJA' }, 'Quiero dejar el curso'),
          ],
        ],
      );
    },
  };

  menu.addEventListener('click', (event) => {
    // Tocar afuera de la hoja la cierra.
    if (event.target === menu) return closeMenu();
    const target = event.target.closest('button');
    if (!target) return;
    unlockAudio();
    if (target.dataset.size) {
      storage.set('charla-letra', target.dataset.size);
      return applySize(target.dataset.size);
    }
    if (target.dataset.action) actions[target.dataset.action]();
  });

  // ---------- Modo demo ----------
  // Solo hace algo en la página de un participante demo: los botones y la pantalla del padrino
  // existen únicamente ahí, y el servidor rechaza estos pedidos para cualquier otro link.

  const demoLessons = $('demo-lessons');

  // Corre un atajo: la conversación anterior se borra y se muestra la pantalla que corresponda.
  function demoAction(action, lessonId) {
    closeMenu();
    if (demoLessons) demoLessons.hidden = true;
    unlockAudio();
    history = [];
    storage.remove(historyKey);
    screen = null;
    send({ action, lessonId }, undefined, '/demo');
  }

  function needsConsent() {
    if (state && state.phase === 'active') return false;
    closeMenu();
    showDialog(
      'Primero tocá «Empezar» y después «Acepto». Los atajos funcionan después del permiso.',
      [['Entendido', 'primary']],
    );
    return true;
  }

  if (demoLessons) {
    Object.assign(actions, {
      'demo-lessons': () => {
        if (needsConsent()) return;
        closeMenu();
        const lessons = (state && state.demo && state.demo.lessons) || [];
        $('demo-lesson-list').replaceChildren(
          ...lessons.map((lesson) =>
            button(
              `${lesson.number}. ${lesson.title}${lesson.antiscam ? ' (antiestafas)' : ''}`,
              'menu-item',
              () => demoAction('lesson', lesson.id),
            ),
          ),
        );
        demoLessons.hidden = false;
      },
      'demo-restart': () => {
        closeMenu();
        showDialog('¿Volver a empezar desde el permiso? Se borra el avance de este demo.', [
          ['Sí, volver a empezar', 'primary', () => demoAction('restart')],
          ['No'],
        ]);
      },
      'demo-antiscam': () => needsConsent() || demoAction('antiscam'),
      'demo-challenge': () => needsConsent() || demoAction('challenge'),
      'demo-progress': () => needsConsent() || demoAction('progress'),
      'demo-end': () => needsConsent() || demoAction('end'),
      'demo-sponsor': () => {
        closeMenu();
        stopPlayback();
        show('sponsor');
        setControls([button('Volver a la app', 'primary', () => refreshState())]);
      },
    });

    demoLessons.addEventListener('click', (event) => {
      if (event.target === demoLessons || event.target.closest('[data-close]')) {
        demoLessons.hidden = true;
      }
    });
  }

  // ---------- Fin ----------

  function showFarewell() {
    showEnd(
      '¡Gracias por haber sido parte de Charlá!',
      'Borramos tus datos. Ya podés cerrar esta página.',
    );
  }

  function showGone() {
    showEnd(
      'Este link no funciona',
      'Si querés seguir con Charlá, pedile un link nuevo a la persona que te lo mandó.',
    );
  }

  // Si la app quedó abierta de un día para el otro, al volver se actualiza el estado.
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      !busy &&
      !isRecording() &&
      Date.now() - lastStateAt > 10 * 60_000
    ) {
      refreshState();
    }
  });

  refreshState();
})();
