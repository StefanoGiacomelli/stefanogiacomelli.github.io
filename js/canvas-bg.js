/**
 * canvas-bg.js — Neural Network themed particle animation
 * MLP/CNN-inspired: layer neurons, conv kernels, activation signals
 *
 * Performance targets:
 *  - Zero ctx.shadowBlur
 *  - 20 fps cap (50 ms minimum frame gap)
 *  - IntersectionObserver: pauses when hero off-screen
 *  - No signal→neuron thread rendering (O(n×m) loop removed)
 *  - Minimal glow: single-circle halo only
 */
export class CanvasBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.neurons     = [];
    this.signals     = [];
    this.prunedPairs = new Set();
    this.mouse       = { x: null, y: null, radius: 240 };
    this.animId      = null;
    this.frame       = 0;
    this.lastTs      = 0;
    this.running     = true;

    // Network structure — shifted right to balance the waveform on the left
    this.layerDefs = [
      { name: 'IN',  count: 6,  xRatio: 0.20, color: [6,   182, 212] },
      { name: 'H1',  count: 11, xRatio: 0.36, color: [99,  102, 241] },
      { name: 'H2',  count: 12, xRatio: 0.52, color: [139,  92, 246] },
      { name: 'H3',  count: 11, xRatio: 0.67, color: [168,  85, 247] },
      { name: 'OUT', count: 5,  xRatio: 0.83, color: [236,  72, 153] },
    ];

    // Bind animate once so rAF doesn't create a closure every frame
    this._tick = this.animate.bind(this);
  }

  rgba([r, g, b], a) { return `rgba(${r},${g},${b},${a})`; }

  init() {
    if (!this.canvas) return;
    this.canvas.style.willChange = 'transform';
    this.resize();
    this.buildNeurons();
    this.buildSignals();
    this.bindEvents();
    this.bindVisibility();
    requestAnimationFrame(this._tick);
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  buildNeurons() {
    this.neurons     = [];
    this.prunedPairs = new Set();
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.layerDefs.forEach((def, li) => {
      const baseX = W * def.xRatio;
      const step  = H / (def.count + 1);
      for (let i = 0; i < def.count; i++) {
        const baseY    = step * (i + 1);
        const isKernel = (li === 1 || li === 2 || li === 3) && (i % 3 === 0);
        const isActive = Math.random() > 0.38;
        this.neurons.push({
          x: baseX + (Math.random() - 0.5) * 18,
          y: baseY + (Math.random() - 0.5) * 30,
          baseX, baseY,
          vx: (Math.random() - 0.5) * 1.4,
          vy: (Math.random() - 0.5) * 1.4,
          size:       Math.random() * 2.0 + 2.8,
          layerIndex: li,
          color:      def.color,
          isKernel, isActive,
          pulseSpeed: Math.random() * 0.018 + 0.009,
          pulsePhase: Math.random() * Math.PI * 2,
          opacity:    isActive ? (Math.random() * 0.1 + 0.90) : (Math.random() * 0.15 + 0.60),
        });
      }
    });

    // Pre-compute ~45% pruned inter-layer pairs (stable)
    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = i + 1; j < this.neurons.length; j++) {
        if (Math.abs(this.neurons[i].layerIndex - this.neurons[j].layerIndex) === 1) {
          if (Math.random() < 0.45) this.prunedPairs.add(`${i}-${j}`);
        }
      }
    }
  }

  buildSignals() {
    this.signals = [];
    const cols = [[6,182,212],[99,102,241],[139,92,246],[236,72,153],[20,184,166]];
    const count = window.innerWidth < 768 ? 45 : 70;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 1.4 + 0.6;
      this.signals.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size:       Math.random() * 1.6 + 0.6,
        color:      cols[Math.floor(Math.random() * cols.length)],
        opacity:    Math.random() * 0.35 + 0.55,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => { this.resize(); this.buildNeurons(); this.buildSignals(); });
    const hero = this.canvas.closest('section') || this.canvas.parentElement;
    hero.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    hero.addEventListener('mouseleave', () => { this.mouse.x = null; this.mouse.y = null; });
  }

  bindVisibility() {
    const obs = new IntersectionObserver(([e]) => {
      this.running = e.isIntersecting;
      if (this.running && !this.animId) requestAnimationFrame(this._tick);
    }, { threshold: 0 });
    obs.observe(this.canvas.closest('section') || this.canvas.parentElement);
  }

  // ─── draw: faint layer labels ─────────────────────────────────────────────────
  drawLabels(time) {
    const fs = this.canvas.width < 768 ? 10 : 13;
    this.ctx.font      = `600 ${fs}px 'JetBrains Mono', monospace`;
    this.ctx.textAlign = 'center';
    const a = 0.038 + Math.sin(time * 0.25) * 0.008;
    this.ctx.fillStyle   = '#ffffff';
    this.ctx.globalAlpha = a;
    this.layerDefs.forEach(d => this.ctx.fillText(d.name, this.canvas.width * d.xRatio, 26));
  }

  // ─── draw: white pruned connections ───────────────────────────────────────────
  drawConnections() {
    const ns      = this.neurons;
    const maxDist = this.canvas.height * 0.58;
    // No ctx.save/restore per-connection — batch state, vary alpha by path
    for (let i = 0; i < ns.length; i++) {
      const a = ns[i];
      for (let j = i + 1; j < ns.length; j++) {
        if (Math.abs(a.layerIndex - ns[j].layerIndex) !== 1) continue;
        if (this.prunedPairs.has(`${i}-${j}`)) continue;
        const b    = ns[j];
        const dx   = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) continue;
        this.ctx.globalAlpha = (1 - dist / maxDist) * 0.22;
        this.ctx.beginPath();
        this.ctx.moveTo(a.x, a.y);
        this.ctx.lineTo(b.x, b.y);
        this.ctx.stroke();
      }
    }
  }

  // ─── draw: neuron (no shadowBlur, minimal glow) ───────────────────────────────
  drawNeuron(n, time) {
    const pulse = Math.sin(time * n.pulseSpeed * 60 + n.pulsePhase) * 0.25 + 0.75;
    const sz    = n.size * pulse;
    const alpha = n.opacity * pulse;
    const ctx   = this.ctx;

    if (n.isKernel) {
      const ks = sz * 2.4, inner = ks * 0.48;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = this.rgba(n.color, 0.95);
      ctx.fillStyle   = this.rgba(n.color, 0.10);
      ctx.lineWidth   = 1.2;
      ctx.beginPath(); ctx.rect(n.x - ks, n.y - ks, ks * 2, ks * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = alpha * 0.4;
      ctx.lineWidth   = 0.6;
      ctx.strokeStyle = this.rgba(n.color, 0.65);
      ctx.beginPath(); ctx.rect(n.x - inner, n.y - inner, inner * 2, inner * 2); ctx.stroke();
      ctx.fillStyle   = this.rgba(n.color, 1);
      for (let dx = -1; dx <= 1; dx += 2) for (let dy = -1; dy <= 1; dy += 2) {
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath(); ctx.arc(n.x + dx * inner * 0.5, n.y + dy * inner * 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (n.isActive) {
      // Single soft outer ring (cheap glow substitute)
      ctx.globalAlpha = alpha * 0.15;
      ctx.fillStyle   = this.rgba(n.color, 0.6);
      ctx.beginPath(); ctx.arc(n.x, n.y, sz * 3, 0, Math.PI * 2); ctx.fill();
      // Core
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = this.rgba(n.color, 1);
      ctx.beginPath(); ctx.arc(n.x, n.y, sz, 0, Math.PI * 2); ctx.fill();
      // White centre
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle   = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(n.x, n.y, sz * 0.35, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = this.rgba(n.color, 0.65);
      ctx.lineWidth   = 0.9;
      ctx.beginPath(); ctx.arc(n.x, n.y, sz, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ─── draw: signal particle (minimal glow) ────────────────────────────────────
  drawSignal(s, time) {
    const pulse = Math.sin(time * s.pulseSpeed * 60 + s.pulsePhase) * 0.25 + 0.75;
    const r     = s.size * pulse;
    const ctx   = this.ctx;
    ctx.globalAlpha = s.opacity * 0.12 * pulse;
    ctx.fillStyle   = this.rgba(s.color, 0.6);
    ctx.beginPath(); ctx.arc(s.x, s.y, r * 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = s.opacity * pulse;
    ctx.fillStyle   = this.rgba(s.color, 1);
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ─── physics: neuron ─────────────────────────────────────────────────────────
  updateNeuron(n) {
    n.x += n.vx; n.y += n.vy;
    n.vx -= (n.x - n.baseX) * 0.0001;
    n.vy -= (n.y - n.baseY) * 0.0001;
    n.vx *= 0.998; n.vy *= 0.998;
    const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (spd < 0.35) { const a = Math.random() * Math.PI * 2; n.vx += Math.cos(a) * 0.15; n.vy += Math.sin(a) * 0.15; }
    if (this.mouse.x !== null) {
      const dx = this.mouse.x - n.x, dy = this.mouse.y - n.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < this.mouse.radius) {
        const f = (this.mouse.radius - d) / this.mouse.radius;
        // Stronger, snappier repulsion
        n.vx -= dx * f * 0.025;
        n.vy -= dy * f * 0.025;
      }
    }
    if (spd > 4.0) { n.vx = (n.vx / spd) * 4.0; n.vy = (n.vy / spd) * 4.0; }
  }

  // ─── physics: signal ─────────────────────────────────────────────────────────
  updateSignal(s) {
    s.x += s.vx; s.y += s.vy;
    if (s.x < -10) s.x = this.canvas.width + 10;
    if (s.x > this.canvas.width + 10) s.x = -10;
    if (s.y < -10) s.y = this.canvas.height + 10;
    if (s.y > this.canvas.height + 10) s.y = -10;
    if (this.mouse.x !== null) {
      const dx = this.mouse.x - s.x, dy = this.mouse.y - s.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < this.mouse.radius) {
        const f = (this.mouse.radius - d) / this.mouse.radius;
        s.vx -= dx * f * 0.020;
        s.vy -= dy * f * 0.020;
      }
    }
    s.vx *= 0.9995; s.vy *= 0.9995;
    const spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (spd > 2.5) { s.vx = (s.vx / spd) * 2.5; s.vy = (s.vy / spd) * 2.5; }
    if (spd < 0.18) { const a = Math.random() * Math.PI * 2; s.vx += Math.cos(a) * 0.06; s.vy += Math.sin(a) * 0.06; }
  }

  // ─── draw: animated audio waveform strip (left) ─────────────────────────────
  drawAudioInput(time) {
    const ctx = this.ctx, H = this.canvas.height;
    const stripW = 52, midX = 8 + stripW / 2;
    const maxAmp = stripW * 0.38;
    const y0 = 0, y1 = H, yH = y1 - y0;
    const scroll = time * 1.1;

    ctx.fillStyle   = 'rgba(6,182,212,0.04)';
    ctx.fillRect(8, 0, stripW, H);

    // 3-harmonic composite (reduced from 5 for speed)
    const wave = t =>
      0.45 * Math.sin(t * 11 * Math.PI + scroll * 3.2) +
      0.30 * Math.sin(t * 27 * Math.PI + scroll * 1.8) +
      0.20 * Math.sin(t * 54 * Math.PI + scroll * 0.9) +
      0.05 * Math.sin(t * 89 * Math.PI - scroll * 1.4);

    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = 'rgba(6,182,212,0.95)';
    ctx.lineWidth   = 1.3;
    ctx.beginPath();
    for (let y = y0; y <= y1; y += 2) {
      const t = (y - y0) / yH;
      // Fade out top and bottom (envelope pattern)
      const env = Math.sin(t * Math.PI);
      const x = midX + wave(t) * maxAmp * env;
      y === y0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    this.neurons
      .filter(n => n.layerIndex === 0)
      .forEach(n => {
        const ny    = Math.min(Math.max(n.y, y0), y1);
        const t     = (ny - y0) / yH;
        const env   = Math.sin(t * Math.PI);
        const waveX = midX + wave(t) * maxAmp * env;

        // Dashed connector
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = 'rgba(6,182,212,0.7)';
        ctx.lineWidth   = 0.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(waveX, ny); ctx.lineTo(n.x, ny); ctx.stroke();
        ctx.setLineDash([]);
        // Sample dot (soft halo + core, no shadowBlur)
        ctx.globalAlpha = 0.15;
        ctx.fillStyle   = 'rgba(6,182,212,0.55)';
        ctx.beginPath(); ctx.arc(waveX, ny, 6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle   = 'rgba(6,182,212,1)';
        ctx.beginPath(); ctx.arc(waveX, ny, 2.2, 0, Math.PI * 2); ctx.fill();
      });
  }

  // ─── animation loop: 20 fps cap + visibility gate ────────────────────────────
  animate(ts = 0) {
    if (!this.running) { this.animId = null; return; }

    // ~20 fps ceiling (50 ms minimum)
    if (ts - this.lastTs < 50) {
      this.animId = requestAnimationFrame(this._tick);
      return;
    }
    this.lastTs = ts;
    this.frame++;

    const ctx  = this.ctx;
    const time = ts * 0.001;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawLabels(time);
    this.drawAudioInput(time);

    // Physics
    this.neurons.forEach(n => this.updateNeuron(n));
    this.signals.forEach(s => this.updateSignal(s));

    // Connections — single batched state
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth   = 0.6;
    this.drawConnections();

    // Neurons and signals
    ctx.lineWidth = 0.9;
    this.neurons.forEach(n => this.drawNeuron(n, time));
    this.signals.forEach(s => this.drawSignal(s, time));

    this.animId = requestAnimationFrame(this._tick);
  }

  destroy() { if (this.animId) cancelAnimationFrame(this.animId); this.running = false; }
}
