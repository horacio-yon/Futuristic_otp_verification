(function () {
  'use strict';
  // Demo-only code: nothing is sent anywhere.
  const CODE = '5451';
  const S = { IDLE: 'IDLE', ROTATING: 'ROTATING', SELECTING: 'SELECTING', VERIFYING: 'VERIFYING', SUCCESS: 'SUCCESS', ERROR: 'ERROR', RESETTING: 'RESETTING' };
  const T = { cooldown: 450, preVerify: 500, unlock: 900, success: 1800, errorShow: 800, errorReset: 1900, resetting: 800, intro: 1800, particles: 26 };
  const HINT = 'DRAG · SCROLL · ← → · ENTER TO CONFIRM';

  const $ = id => document.getElementById(id);
  const app = $('app'), stage = $('stage'), status = $('status'), numEl = $('num'), center = $('center');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const audio = new AudioController();
  const otp = new OtpController([...document.querySelectorAll('.slot')], CODE);

  let state = S.RESETTING, runId = 0;
  const timers = new Set();

  // Tracked timers so a reset never leaves pending callbacks behind.
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  const canInput = () => state === S.IDLE || state === S.ROTATING;
  function setState(s) { state = s; app.dataset.state = s; dial.enabled = canInput(); }
  function setStatus(text, kind) { status.textContent = text; status.dataset.kind = kind || ''; }

  const dial = new DialController($('dial'), {
    onTick: () => audio.click(),
    onIndex: i => { numEl.textContent = i; },
    onMotion: m => { if (m && state === S.IDLE) setState(S.ROTATING); },
    onSettle: () => { if (state === S.ROTATING) setState(S.IDLE); }
  });

  // ----- Confirming digits -----
  function confirm() {
    if ((state !== S.IDLE && state !== S.ROTATING) || !dial.isSettled()) return;
    otp.push(dial.index);
    audio.unlock();
    audio.confirm();
    app.classList.toggle('tone-c', otp.digits.length % 2 === 1); // Alternate purple/cyan tone per digit.
    center.classList.remove('confirm'); void center.getBoundingClientRect(); center.classList.add('confirm');
    setState(S.SELECTING); // locks input: one digit per confirmation
    if (otp.complete) later(verify, T.preVerify);
    else later(() => setState(S.IDLE), T.cooldown);
  }

  // ----- Verification timeline -----
  function verify() {
    setState(S.VERIFYING);
    dial.halt();
    stage.classList.add('verifying', 'show-lock');
    app.classList.add('verifying');
    setStatus('VERIFYING…', '');
    if (otp.matches()) {
      later(() => { stage.classList.add('unlocked'); audio.unlock_(); }, T.unlock);
      later(success, T.success);
    } else later(denied, T.errorShow);
  }

  function success() {
    setState(S.SUCCESS);
    stage.classList.add('granted'); app.classList.add('granted');
    const burst = $('burst'); burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
    spawnParticles();
    setStatus('ACCESS GRANTED', 'ok');
    audio.success();
  }

  function denied() {
    setState(S.ERROR);
    app.classList.add('error');
    otp.shake();
    setStatus('ACCESS DENIED', 'err');
    audio.error();
    later(restart, T.errorReset);
  }

  function spawnParticles() {
    const box = $('particles'), w = stage.clientWidth;
    for (let i = 0; i < T.particles; i++) {
      const p = document.createElement('span');
      p.className = 'p';
      p.style.setProperty('--dx', ((Math.random() - 0.5) * w * 1.2).toFixed(0) + 'px');
      p.style.setProperty('--dy', ((Math.random() - 0.7) * w * 0.9).toFixed(0) + 'px');
      p.style.setProperty('--t', (2.5 + Math.random() * 2.5).toFixed(1) + 's');
      p.style.setProperty('--d', (Math.random() * 2).toFixed(1) + 's');
      box.appendChild(p);
    }
  }

  // ----- Reset & modes -----
  function resetUi() {
    runId++; clearTimers();
    ['verifying', 'show-lock', 'unlocked', 'granted'].forEach(c => stage.classList.remove(c));
    ['verifying', 'granted', 'error', 'tone-c'].forEach(c => app.classList.remove(c));
    $('particles').textContent = '';
    $('burst').classList.remove('go');
    otp.clear();
    setStatus(HINT, 'hint');
  }

  function restart() {
    resetUi();
    setState(S.RESETTING);
    later(() => {
      setState(S.IDLE);
    }, T.resetting);
  }

  // ----- Input wiring -----
  center.addEventListener('click', () => {
    if (state !== S.SUCCESS) confirm();
  });
  document.addEventListener('keydown', e => {
    const onButton = e.target.tagName === 'BUTTON';
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); if (canInput()) dial.nudge(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); if (canInput()) dial.nudge(-1); }
    else if ((e.key === 'Enter' || e.key === ' ') && !onButton && !e.repeat) { e.preventDefault(); confirm(); }
  });
  // Unlock Web Audio on the first user gesture; playback never starts on page load.
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true, capture: true, passive: true });
  document.addEventListener('keydown', () => audio.unlock(), { once: true, capture: true, passive: true });
  document.addEventListener('wheel', () => audio.unlock(), { once: true, capture: true, passive: true });

  // ----- Intro: the dial spins into place -----
  setStatus(HINT, 'hint');
  if (!reduced) { dial.setAngle(220); dial.animateTo(0, T.intro); }
  later(() => setState(S.IDLE), reduced ? 0 : T.intro);
})();
