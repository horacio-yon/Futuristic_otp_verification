(function (g) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const NUM_RADIUS = 178;
  const COUNT = 10, STEP = 360 / COUNT, TICKS = 100;
  const FREE_SPIN_MIN = 120;   // deg/s: below this the dial is pulled to the nearest detent
  const FRICTION = 2.4;        // inertia decay
  const STIFFNESS = 150;       // detent spring
  const DAMPING = 2 * Math.sqrt(STIFFNESS); // critically damped: no bounce
  const MAX_VELOCITY = 2200;
  const WHEEL_THROTTLE = 90;   // ms between wheel notches

  const mod = (n, m) => ((n % m) + m) % m;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  /**
   * Rotary dial: drag / wheel / keys, inertia, detent snapping.
   * Selection is derived from the angle: digit i sits at i*36deg, so it
   * is under the fixed pointer when angle = -i*36 (mod 360).
   */
  class DialController {
    constructor(svg, callbacks) {
      this.svg = svg;
      this.wheel = svg.querySelector('#wheel');
      this.cb = callbacks;
      this.angle = 0; this.vel = 0; this.goal = null; this.tween = null;
      this.dragging = false; this.enabled = false; this.running = false;
      this.last = 0; this.rawIdx = 0; this.samples = []; this.lastWheel = 0; this.nums = [];
      this._frame = this._frame.bind(this);
      this._build();
      this._bind();
      this.render();
      this._mark();
    }

    get index() { return mod(Math.round(-this.angle / STEP), COUNT); }
    isSettled() { return !this.running && !this.dragging; }

    _build() {
      const ticks = this.wheel.querySelector('#ticks');
      const nums = this.wheel.querySelector('#nums');
      for (let i = 0; i < TICKS; i++) {
        const major = i % 10 === 0;
        ticks.appendChild(svgEl('line', {
          x1: 0, x2: 0, y1: major ? -236 : -247, y2: -259,
          transform: `rotate(${i * 3.6})`, class: major ? 'tick major' : 'tick'
        }));
      }
      for (let i = 0; i < COUNT; i++) {
        const t = svgEl('text', { class: 'num' });
        const a = (i * STEP * Math.PI) / 180;
        t.dataset.x = (NUM_RADIUS * Math.sin(a)).toFixed(2);
        t.dataset.y = (-NUM_RADIUS * Math.cos(a)).toFixed(2);
        t.textContent = i;
        nums.appendChild(t);
        this.nums.push(t);
      }
    }

    _mark() {
      const idx = this.index;
      this.nums.forEach((n, i) => n.classList.toggle('sel', i === idx));
    }

    render() {
      this.wheel.setAttribute('transform', `rotate(${this.angle.toFixed(2)})`);
      // Counter-rotate each digit so it always stays upright on screen.
      const inv = (-this.angle).toFixed(2);
      this.nums.forEach(n => n.setAttribute('transform', `translate(${n.dataset.x} ${n.dataset.y}) rotate(${inv})`));
      const raw = Math.round(-this.angle / STEP);
      if (raw !== this.rawIdx) {
        this.rawIdx = raw;
        this._mark();
        this.cb.onIndex(this.index);
        this.cb.onTick?.();
      }
    }

    _kick() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      this.cb.onMotion(true);
      requestAnimationFrame(this._frame);
    }

    _frame(now) {
      const dt = Math.min((now - this.last) / 1000, 0.034);
      this.last = now;
      const moving = this._step(dt, now);
      this.render();
      if (moving) requestAnimationFrame(this._frame);
      else { this.running = false; this.cb.onSettle(); }
    }

    // Returns true while the dial is still moving.
    _step(dt, now) {
      if (this.dragging) return true;
      if (this.tween) {
        const tw = this.tween;
        const p = Math.max(0, Math.min((now - tw.t0) / tw.ms, 1));
        this.angle = tw.from + (tw.to - tw.from) * ease(p);
        if (p >= 1) { this.angle = tw.to; this.tween = null; tw.done(); }
        return !!this.tween;
      }
      if (this.goal === null && Math.abs(this.vel) > FREE_SPIN_MIN) {
        this.angle += this.vel * dt;
        this.vel *= Math.exp(-FRICTION * dt);
        return true;
      }
      const target = this.goal !== null ? this.goal : Math.round(this.angle / STEP) * STEP;
      const acc = (target - this.angle) * STIFFNESS - this.vel * DAMPING;
      this.vel += acc * dt;
      this.angle += this.vel * dt;
      if (Math.abs(target - this.angle) < 0.03 && Math.abs(this.vel) < 3) {
        this.angle = target; this.vel = 0; this.goal = null;
        return false;
      }
      return true;
    }

    _pointerAngle(e) {
      const r = this.svg.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    }

    _bind() {
      const s = this.svg;
      s.addEventListener('pointerdown', e => {
        if (!this.enabled || e.target.closest('#center')) return;
        this.dragging = true; this.tween = null; this.goal = null; this.vel = 0; this.samples = [];
        this.pa = this._pointerAngle(e);
        s.setPointerCapture(e.pointerId);
        s.classList.add('grabbing');
        this._kick();
      });
      s.addEventListener('pointermove', e => {
        if (!this.dragging) return;
        const a = this._pointerAngle(e);
        let d = a - this.pa;
        if (d > 180) d -= 360; else if (d < -180) d += 360;
        this.pa = a;
        this.angle += d;
        const t = performance.now();
        this.samples.push({ t, a: this.angle });
        while (this.samples.length > 1 && t - this.samples[0].t > 90) this.samples.shift();
      });
      const end = () => {
        if (!this.dragging) return;
        this.dragging = false;
        s.classList.remove('grabbing');
        const f = this.samples[0], l = this.samples[this.samples.length - 1];
        let v = 0;
        if (f && l && l.t > f.t && performance.now() - l.t < 80) v = (l.a - f.a) / ((l.t - f.t) / 1000);
        this.vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));
        this.last = performance.now();
      };
      s.addEventListener('pointerup', end);
      s.addEventListener('pointercancel', end);
      s.addEventListener('wheel', e => {
        e.preventDefault();
        const n = performance.now();
        if (!this.enabled || n - this.lastWheel < WHEEL_THROTTLE) return;
        this.lastWheel = n;
        this.nudge(e.deltaY > 0 ? 1 : -1);
      }, { passive: false });
    }

    /** Move one detent: +1 = next digit, -1 = previous digit. */
    nudge(dir) {
      if (!this.enabled || this.dragging || this.tween) return;
      const base = this.goal !== null ? this.goal : Math.round(this.angle / STEP) * STEP;
      this.goal = base - dir * STEP;
      this._kick();
    }

    animateTo(angle, ms) {
      return new Promise(done => {
        this.goal = null; this.vel = 0;
        this.tween = { from: this.angle, to: angle, t0: performance.now(), ms, done };
        this._kick();
      });
    }

    /** Rotate along the shortest path so digit i ends under the pointer. */
    rotateToIndex(i, ms) {
      const d = mod(i - this.index + 5, COUNT) - 5 || COUNT;
      const base = Math.round(this.angle / STEP) * STEP;
      return this.animateTo(base - d * STEP, ms || 500 + Math.abs(d) * 170);
    }

    setAngle(a) { this.angle = a; this.render(); }

    /** Ease out of any motion onto the nearest detent. */
    halt() {
      this.tween = null;
      this.goal = Math.round(this.angle / STEP) * STEP;
      this._kick();
    }
  }

  g.DialController = DialController;
})(window);
