/* =========================================================
   Calculadora EPN — lógica de la aplicación
   Reglas de aprobación:
     · Total >= 28 / 40 ............ APROBADO
     · 18 <= Total < 28 ............ EXAMEN SUPLETORIO
     · Total < 18 / 40 ............. REPROBADO
   ========================================================= */
(function () {
  "use strict";

  /* ---------- constantes de negocio ---------- */
  const PASS = 28;           // límite superior del supletorio / mínimo de aprobación
  const MIN_SUPLETORIO = 18; // límite inferior del supletorio (inclusive)
  const MAX_TOTAL = 40;      // tope del acumulado (para el medidor)
  const MAX_EACH = 20;       // nota máxima por bimestre

  /**
   * Evalúa las notas de los dos bimestres.
   * @param {number} n1 nota del primer bimestre (0-20)
   * @param {number} n2 nota del segundo bimestre (0-20)
   * @returns {{state:"pass"|"remedial"|"fail", total:number}}
   */
  function evaluate(n1, n2) {
    const total = Math.round((n1 + n2) * 100) / 100;

    if (total >= PASS) return { state: "pass", total };
    // Examen supletorio: 18 <= total < 28
    if (total >= MIN_SUPLETORIO && total < PASS) return { state: "remedial", total }; // examen supletorio
    return { state: "fail", total };
  }

  const COPY = {
    pass: {
      icon: "🏆", title: "Aprobado",
      desc: "¡Felicidades! Superaste la nota mínima de aprobación del curso.",
      req: "Requisito cumplido: ≥ 28 / 40",
      pill: "APROBADO"
    },
    remedial: {
      icon: "📖", title: "Examen Supletorio",
      desc: "Tu acumulado entra en el rango de supletorio (18 ≤ Total < 28): calificas para presentarlo.",
      req: "Rango habilitado: 18 ≤ Total < 28",
      pill: "SUPLETORIO"
    },
    fail: {
      icon: "📉", title: "Reprobado",
      desc: "No alcanzaste el mínimo exigido. Repites el curso.",
      req: "Se reprueba con Total < 18 / 40",
      pill: "REPROBADO"
    },
    idle: {
      icon: "🧮", title: "Ingresa tus notas",
      desc: "El resultado se muestra automáticamente mientras escribes.",
      req: "Aprueba desde 28/40",
      pill: "—"
    }
  };

  const COLOR = {
    pass: "#9ec3ff",
    remedial: "#ff9db0",
    fail: "#ffb3c0",
    idle: "#a8b4d8"
  };

  /* ---------- referencias del DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const n1 = $("n1"), n2 = $("n2"), e1 = $("e1"), e2 = $("e2");
  const totalEl = $("total"), prog = $("prog"), verdict = $("verdict");
  const vIcon = $("vIcon"), vTitle = $("vTitle"), vDesc = $("vDesc"),
        vReq = $("vReq"), statusPill = $("statusPill");
  const rules = document.querySelectorAll(".rule");

  const CIRC = 2 * Math.PI * 74; // 464.96
  let lastState = null;
  let animFrame = null;

  const clamp = (v) => Math.min(MAX_EACH, Math.max(0, v));

  /* ---------- validación ---------- */
  function readValue(input, errEl) {
    const raw = input.value.trim();
    input.classList.remove("invalid");
    errEl.textContent = "";

    if (raw === "") return { value: null, empty: true };

    const v = Number(raw);
    if (!Number.isFinite(v)) {
      input.classList.add("invalid");
      errEl.textContent = "Valor no numérico.";
      return { value: null, empty: false };
    }
    if (v < 0 || v > MAX_EACH) {
      input.classList.add("invalid");
      errEl.textContent = `La nota debe estar entre 0 y ${MAX_EACH}.`;
      return { value: clamp(v), empty: false, bad: true };
    }
    return { value: v, empty: false };
  }

  const hasError = () => e1.textContent !== "" || e2.textContent !== "";

  /* ---------- render ---------- */
  function render() {
    const a = readValue(n1, e1);
    const b = readValue(n2, e2);

    const ready = !a.empty && !b.empty && !a.bad && !b.bad && a.value !== null && b.value !== null;
    const res = ready ? evaluate(a.value, b.value) : null;
    const total = res ? res.total : 0;

    animateNumber(totalEl, res ? total : 0);

    const ratio = res ? Math.min(total / MAX_TOTAL, 1) : 0;
    prog.style.strokeDashoffset = String(CIRC * (1 - ratio));

    const state = res ? res.state : "idle";
    const copy = COPY[state];

    verdict.className = "verdict " + state;
    vIcon.textContent = copy.icon;
    vTitle.textContent = copy.title;
    vDesc.textContent = copy.desc;
    vReq.textContent = copy.req;
    statusPill.textContent = copy.pill;
    statusPill.style.color = COLOR[state];

    rules.forEach((r) => r.classList.toggle("active", !!res && r.dataset.rule === state));

    if (res && state !== lastState) {
      if (lastState !== null) AudioFX.chime(state);
      lastState = state;
    }
    if (!res) lastState = null;
  }

  /* ---------- contador animado ---------- */
  function animateNumber(el, target) {
    const from = Number(el.textContent) || 0;
    if (Math.abs(from - target) < 0.01) {
      el.textContent = target.toFixed(target % 1 ? 2 : 0);
      return;
    }
    cancelAnimationFrame(animFrame);
    const start = performance.now();
    const dur = 550;

    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      el.textContent = (p === 1 ? target : val).toFixed(2);
      if (p < 1) animFrame = requestAnimationFrame(step);
    };
    animFrame = requestAnimationFrame(step);
  }

  /* ---------- eventos ---------- */
  [n1, n2].forEach((i) => i.addEventListener("input", render));

  [n1, n2].forEach((i) =>
    i.addEventListener("blur", () => {
      if (i.value.trim() !== "") {
        const v = Number(i.value);
        if (Number.isFinite(v)) i.value = clamp(v).toFixed(2);
        render();
      }
    })
  );

  const form = $("gradeForm");
  if (form) {
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      render();
      if (hasError()) { (e1.textContent ? n1 : n2).focus(); return; }
      AudioFX.uiClick();
      verdict.style.animation = "none";
      void verdict.offsetWidth;
      verdict.style.animation = "";
      verdict.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  $("clearBtn").addEventListener("click", () => {
    n1.value = "";
    n2.value = "";
    e1.textContent = "";
    e2.textContent = "";
    n1.classList.remove("invalid");
    n2.classList.remove("invalid");
    render();
    n1.focus();
  });

  /* =========================================================
     AUDIO AMBIENTE (Web Audio API, sin archivos externos)
     ========================================================= */
  const AudioFX = (function () {
    let ctx = null, master = null, filter = null;
    let playing = false, timer = null;
    let nextChordTime = 0, chordIndex = 0;

    // Progresión suave: Cmaj9 → Am9 → Fmaj9 → G6
    const CHORDS = [
      [261.63, 329.63, 392.00, 493.88, 587.33],
      [220.00, 261.63, 329.63, 392.00, 493.88],
      [174.61, 220.00, 261.63, 329.63, 392.00],
      [196.00, 246.94, 293.66, 392.00, 440.00]
    ];
    const CHORD_LEN = 5.2;
    const BELL = [523.25, 587.33, 659.25, 783.99, 880.00];

    function init() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2100;
      filter.Q.value = 0.6;
      filter.connect(master);
      master.connect(ctx.destination);
    }

    function pad(freq, t) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * (1 + (Math.random() * 0.003 - 0.0015));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.075, t + 1.8);
      g.gain.setValueAtTime(0.075, t + CHORD_LEN - 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + CHORD_LEN + 0.6);
      o.connect(g);
      g.connect(filter);
      o.start(t);
      o.stop(t + CHORD_LEN + 0.7);
    }

    function bell(freq, t, vol) {
      vol = vol || 0.05;
      const o = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      sub.type = "triangle";
      sub.frequency.value = freq / 2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g);
      sub.connect(g);
      g.connect(filter);
      o.start(t); o.stop(t + 2.5);
      sub.start(t); sub.stop(t + 2.5);
    }

    function scheduleChord(t) {
      const chord = CHORDS[chordIndex];
      chord.forEach(function (f, i) {
        setTimeout(function () {
          if (playing && ctx) pad(f, Math.max(ctx.currentTime, t));
        }, i * 90);
      });
      if (chordIndex % 2 === 0) bell(BELL[chordIndex % BELL.length], t + 1.4, 0.045);
      else bell(BELL[(chordIndex + 2) % BELL.length], t + 2.6, 0.035);
      chordIndex = (chordIndex + 1) % CHORDS.length;
    }

    function loop() {
      if (!ctx || !playing) return;
      while (nextChordTime < ctx.currentTime + 2.5) {
        scheduleChord(nextChordTime);
        nextChordTime += CHORD_LEN;
      }
    }

    function start() {
      init();
      if (!ctx) return false;
      if (ctx.state === "suspended") ctx.resume();
      playing = true;
      nextChordTime = ctx.currentTime + 0.15;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
      loop();
      timer = setInterval(loop, 700);
      return true;
    }

    function stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    }

    function chime(state) {
      if (!ctx || !playing) return;
      const t = ctx.currentTime + 0.02;
      const seq = state === "pass" ? [523.25, 659.25, 783.99, 1046.5]
        : state === "remedial" ? [440, 554.37, 659.25]
        : [392, 349.23, 293.66];
      seq.forEach(function (f, i) {
        bell(f, t + i * 0.11, state === "fail" ? 0.04 : 0.06);
      });
    }

    function uiClick() {
      if (!ctx || !playing) return;
      bell(880, ctx.currentTime + 0.01, 0.035);
    }

    return { start: start, stop: stop, chime: chime, uiClick: uiClick };
  })();

  /* ---------- control de música ---------- */
  const audioBtn = $("audioBtn");
  let musicOn = false;

  function setMusic(on) {
    musicOn = on;
    if (on) AudioFX.start(); else AudioFX.stop();
    audioBtn.classList.toggle("on", on);
    audioBtn.classList.toggle("off", !on);
    audioBtn.setAttribute("aria-pressed", String(on));
    audioBtn.querySelector(".txt").textContent = on ? "Música activa" : "Música";
  }

  audioBtn.addEventListener("click", function () { setMusic(!musicOn); });

  // El navegador solo permite audio tras un gesto del usuario
  function firstGesture() {
    document.removeEventListener("pointerdown", firstGesture);
    document.removeEventListener("keydown", firstGesture);
    if (!musicOn) setMusic(true);
  }
  document.addEventListener("pointerdown", firstGesture);
  document.addEventListener("keydown", firstGesture);

  render();
})();
