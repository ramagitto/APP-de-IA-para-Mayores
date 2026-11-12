// Charlá: app web del piloto, sin frameworks ni dependencias.
// Probada en el diseño para Chrome de Android y Safari de iPhone (iOS 14.3 o más nuevo):
// - el micrófono pide permiso recién cuando la persona toca "hablar";
// - se graba en WebM/Opus (Android) o MP4/AAC (iPhone), según lo que acepte el navegador;
// - el iPhone no reproduce audio solo si no hubo un toque antes: el primer toque "destraba" el
//   reproductor, y después se reutiliza el mismo para cada audio.
(() => {
  'use strict';

  const token = location.pathname.split('/')[2] || '';
  const base = `/p/${token}`;
  // Un mismo celular puede tener más de un participante: el historial se separa por link.
  const historyKey = `charla-historial-${token.slice(0, 10)}`;
  const MAX_HISTORY = 60;
  const MAX_RECORDING_SECONDS = 120;
  const SIZES = ['normal', 'grande', 'enorme'];

  const $ = (id) => document.getElementById(id);
  const chat = $('chat');
  const statusBox = $('status');
  const choices = $('choices');
  const voiceBox = $('voice');
  const micButton = $('mic');
  const micLabel = $('mic-label');
  const cancelButton = $('cancel-recording');
  const keyboardButton = $('show-keyboard');
  const writeForm = $('write');
  const textInput = $('text');
  const menu = $('menu');
  const menuButton = $('menu-button');
  const streakBox = $('streak');

  const LABELS = {
    intro: 'Lección',
    feedback: 'Charlá',
    challenge: 'Desafío',
    closing: 'Charlá',
    care: 'Importante',
    info: 'Charlá',
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
  let voiceInput = 'off';
  let busy = false;
  let lastStateAt = 0;
  let installPrompt = null;

  // ---------- Tamaño de letra ----------

  function applySize(size) {
    document.documentElement.dataset.size = size;
  }
  applySize(storage.get('charla-letra') || 'normal');

  function nextSize() {
    const current = storage.get('charla-letra') || 'normal';
    const next = SIZES[(SIZES.indexOf(current) + 1) % SIZES.length];
    storage.set('charla-letra', next);
    applySize(next);
    return next;
  }

  // ---------- Mensajes en pantalla ----------

  function scrollToEnd(element) {
    requestAnimationFrame(() => element.scrollIntoView({ block: 'end', behavior: 'smooth' }));
  }

  function renderBubble(entry) {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${entry.who}`;
    if (entry.kind === 'care') bubble.classList.add('care');

    if (entry.who === 'charla') {
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = LABELS[entry.kind] || 'Charlá';
      bubble.append(label);

      if (entry.format === 'audio') {
        const listen = document.createElement('button');
        listen.type = 'button';
        listen.className = 'listen secondary';
        listen.textContent = '🔊 Escuchar';
        listen.addEventListener('click', () => {
          unlockAudio();
          playNow(entry);
        });
        bubble.append(listen);
      }
    }

    const body = document.createElement('div');
    body.textContent = entry.text;
    bubble.append(body);
    chat.append(bubble);
    return bubble;
  }

  function addEntry(entry) {
    history.push(entry);
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    storage.set(historyKey, history);
    const bubble = renderBubble(entry);
    scrollToEnd(bubble);
    return bubble;
  }

  // Un mensaje de Charlá que se muestra pero no se guarda (por ejemplo, el saludo inicial).
  function addLocal(text) {
    const bubble = renderBubble({ who: 'charla', kind: 'info', format: 'text', text });
    scrollToEnd(bubble);
  }

  function showStatus(text, isError) {
    statusBox.textContent = text || '';
    statusBox.classList.toggle('error', Boolean(isError));
  }

  let thinkingBubble = null;
  function showThinking(text) {
    hideThinking();
    thinkingBubble = document.createElement('div');
    thinkingBubble.className = 'bubble charla thinking';
    thinkingBubble.textContent = text;
    chat.append(thinkingBubble);
    scrollToEnd(thinkingBubble);
  }
  function hideThinking() {
    if (thinkingBubble) thinkingBubble.remove();
    thinkingBubble = null;
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
    if (!response.ok) throw new Error('');
    return response.json();
  }

  async function send(payload, shownText) {
    if (busy) return;
    busy = true;
    setEnabled(false);
    showStatus('');
    stopPlayback();

    if (shownText) addEntry({ who: 'person', text: shownText });
    showThinking('Charlá está pensando…');
    // El servidor gratuito se duerme si nadie lo usa: la primera vez puede tardar casi un minuto.
    const slow = setTimeout(
      () =>
        showThinking(
          'Charlá se está despertando. La primera vez del día puede tardar hasta un minuto…',
        ),
      6000,
    );

    try {
      const data = await request('/mensajes', { method: 'POST', body: JSON.stringify(payload) });
      hideThinking();

      if (payload.audio) {
        addEntry({ who: 'person', text: data.transcript ? `🎤 ${data.transcript}` : '🎤 Audio' });
      }

      const fresh = data.messages.map((message) => ({
        who: 'charla',
        kind: message.kind,
        format: message.format,
        text: message.text,
        audioUrl: message.audioUrl,
      }));
      fresh.forEach(addEntry);

      if (data.forgotten) return showFarewell();
      if (data.state) applyState(data.state);
      enqueue(fresh.filter((entry) => entry.format === 'audio'));
      if (fresh.length === 0) refreshState();
    } catch (error) {
      hideThinking();
      if (error.message === 'gone') return;
      showStatus(
        error.message || 'No me llegó tu mensaje. Revisá que tengas internet y probá de nuevo.',
        true,
      );
      if (payload.audio || payload.text) offerRetry(payload);
    } finally {
      clearTimeout(slow);
      busy = false;
      setEnabled(true);
    }
  }

  function offerRetry(payload) {
    const retry = button('Probar de nuevo', 'primary', () => {
      unlockAudio();
      send(payload);
    });
    choices.replaceChildren(retry);
  }

  async function refreshState() {
    try {
      const data = await request('/estado');
      voiceInput = data.voiceInput;
      lastStateAt = Date.now();
      applyState(data);
    } catch (error) {
      if (error.message === 'gone') return;
      showStatus('No me pude conectar. Revisá que tengas internet.', true);
      choices.replaceChildren(button('Probar de nuevo', 'primary', refreshState));
    }
  }

  // ---------- Qué botones mostrar ----------

  function button(text, className, onClick) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = text;
    element.addEventListener('click', onClick);
    return element;
  }

  function hint(text) {
    const element = document.createElement('p');
    element.className = 'hint';
    element.textContent = text;
    return element;
  }

  function quick(text, message, className) {
    return button(text, className || 'secondary', () => {
      unlockAudio();
      send({ text: message }, text);
    });
  }

  function showVoice(show) {
    const canTalk = show && voiceInput !== 'off';
    voiceBox.hidden = !canTalk;
    keyboardButton.hidden = !show || !writeForm.hidden;
    if (!show) writeForm.hidden = true;
    // Sin micrófono, el teclado queda abierto.
    if (show && voiceInput === 'off') {
      writeForm.hidden = false;
      keyboardButton.hidden = true;
    }
  }

  function applyState(next) {
    state = next;
    streakBox.hidden = !(state.streak > 0);
    streakBox.textContent =
      state.streak === 1 ? '⭐ 1 lección' : `⭐ ${state.streak} lecciones seguidas`;

    const items = [];
    let talk = false;

    if (state.phase === 'welcome') {
      if (history.length === 0) addLocal('¡Hola! Soy Charlá. Tocá el botón verde para empezar.');
      items.push(quick('Empezar', 'Hola', 'primary'));
    } else if (state.phase === 'consent') {
      items.push(quick('Acepto', 'ACEPTO', 'primary'));
      items.push(quick('No, gracias', 'NO'));
    } else {
      const lesson = state.lesson || { kind: 'done_today' };
      if (lesson.kind === 'ready') {
        items.push(hint(`Lección ${lesson.lessonNumber}: ${lesson.lessonTitle}`));
        items.push(quick('Empezar la lección de hoy', 'Empezar la lección', 'primary'));
      } else if (lesson.kind === 'in_lesson') {
        if (history.length === 0) {
          addEntry({ who: 'charla', kind: 'intro', format: 'audio', text: lesson.prompt });
        }
        talk = true;
        if (lesson.step === 'challenge') {
          items.push(quick('Sí, lo hice', 'Sí, lo hice', 'primary'));
          items.push(quick('Todavía no pude', 'No pude'));
        }
      } else if (lesson.kind === 'done_today') {
        items.push(hint('Ya hiciste la lección de hoy. ¡Nos vemos en la próxima!'));
      } else {
        items.push(hint('Terminaste todas las lecciones que tenemos por ahora. ¡Felicitaciones!'));
      }
    }

    choices.replaceChildren(...items);
    showVoice(talk);
  }

  function setEnabled(enabled) {
    document
      .querySelectorAll('.controls button, .controls textarea, .menu button')
      .forEach((element) => {
        if (element !== micButton && element !== cancelButton) element.disabled = !enabled;
      });
    micButton.disabled = !enabled && !isRecording();
  }

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
    cancelButton.hidden = !recording;
    micLabel.textContent = recording ? 'Te escucho… Tocá para enviar' : 'Tocá para hablar';
    keyboardButton.hidden = recording || !writeForm.hidden;
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

  // ---------- Teclado ----------

  function openKeyboard() {
    writeForm.hidden = false;
    keyboardButton.hidden = true;
    textInput.focus();
  }

  keyboardButton.addEventListener('click', openKeyboard);

  writeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    unlockAudio();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    send({ text }, text);
  });

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

  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }

  menuButton.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    // Android: guardamos el aviso para ofrecerlo desde el menú, cuando la persona quiera.
    event.preventDefault();
    installPrompt = event;
  });

  const actions = {
    'text-size': () => {
      const size = nextSize();
      showStatus(size === 'normal' ? 'Letra normal.' : `Letra ${size}.`);
    },
    install: () => {
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
      showDialog(
        '¿Seguro que querés dejar el curso?\n\nVamos a borrar todos tus datos y este link va a dejar de funcionar.',
        [
          ['No, quiero seguir', 'primary'],
          ['Sí, borrar mis datos', 'danger', () => send({ text: 'BAJA' }, 'Quiero dejar el curso')],
        ],
      );
    },
  };

  menu.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    unlockAudio();
    closeMenu();
    actions[target.dataset.action]();
  });

  // ---------- Fin ----------

  function endScreen(title, text) {
    stopPlayback();
    storage.remove(historyKey);
    document.querySelector('.controls').hidden = true;
    menuButton.hidden = true;
    menu.hidden = true;
    streakBox.hidden = true;
    const main = $('main');
    const heading = document.createElement('h1');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    const wrapper = document.createElement('div');
    wrapper.className = 'gone';
    wrapper.append(heading, paragraph);
    main.replaceChildren(wrapper);
  }

  function showFarewell() {
    endScreen(
      '¡Gracias por haber sido parte de Charlá!',
      'Borramos tus datos. Ya podés cerrar esta página.',
    );
  }

  function showGone() {
    endScreen(
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

  history.forEach(renderBubble);
  if (chat.lastChild) chat.lastChild.scrollIntoView({ block: 'end' });
  refreshState();
})();
