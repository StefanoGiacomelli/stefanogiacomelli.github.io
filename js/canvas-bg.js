/**
 * canvas-bg.js — Neural network particle animation for hero background
 * Interactive particle system with connections, responding to mouse movement
 * Light/white tones for contrast against dark background
 */
export class CanvasBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 200 };
    this.animationId = null;
    // Bright, light tones for contrast on dark bg
    this.colors = [
      'rgba(255, 255, 255, 0.9)',
      'rgba(220, 240, 255, 0.85)',
      'rgba(200, 230, 255, 0.8)',
      'rgba(180, 220, 255, 0.75)',
      'rgba(160, 210, 245, 0.7)',
      'rgba(140, 200, 235, 0.65)',
    ];
    this.maxParticles = 150;
    this.connectionDistance = 150;
  }

  init() {
    if (!this.canvas) return;
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    // More particles, adapt for mobile
    const count = window.innerWidth < 768 ? 70 : this.maxParticles;
    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 0.8 + 0.2;
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2.5 + 0.8,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        opacity: Math.random() * 0.6 + 0.4,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
        // Some particles are "nodes" (larger), others are small
        isNode: Math.random() < 0.25,
      });
    }
    // Make node particles larger
    this.particles.forEach(p => {
      if (p.isNode) {
        p.size = Math.random() * 2.0 + 2.5;
        p.opacity = Math.random() * 0.3 + 0.6;
      }
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });

    // Listen on the hero section (parent), not the canvas itself,
    // since overlay divs sit above the canvas
    const heroSection = this.canvas.closest('section') || this.canvas.parentElement;

    heroSection.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    heroSection.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const time = Date.now() * 0.001;

    // Draw connections first (behind particles)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          const opacity = (1 - dist / this.connectionDistance) * 0.2;
          
          // Brighter connections for node-to-node
          const isNodeConnection = p.isNode && p2.isNode;
          const lineOpacity = isNodeConnection ? opacity * 2.5 : opacity;
          const lineWidth = isNodeConnection ? 1.0 : 0.4;
          
          this.ctx.save();
          this.ctx.globalAlpha = Math.min(lineOpacity, 0.4);
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
          this.ctx.lineWidth = lineWidth;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }

    // Update and draw particles
    this.particles.forEach(p => {
      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges smoothly
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;

      // Mouse interaction: push away strongly + attract slightly
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          // Strong push away from cursor
          p.vx -= dx * force * 0.006;
          p.vy -= dy * force * 0.006;
        } else if (dist < this.mouse.radius * 2.5) {
          // Subtle attraction at larger range
          const force = (this.mouse.radius * 2.5 - dist) / (this.mouse.radius * 2.5);
          p.vx += dx * force * 0.0003;
          p.vy += dy * force * 0.0003;
        }
      }

      // Speed limit
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = 1.2;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // Very light damping to keep movement organic
      p.vx *= 0.9995;
      p.vy *= 0.9995;

      // Ensure minimum speed so particles always move
      if (speed < 0.15) {
        const angle = Math.random() * Math.PI * 2;
        p.vx += Math.cos(angle) * 0.05;
        p.vy += Math.sin(angle) * 0.05;
      }

      // Pulse effect
      const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulsePhase) * 0.4 + 0.6;
      const currentSize = p.size * pulse;

      // Draw particle with glow
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity * pulse;

      if (p.isNode) {
        // Larger node particles get a brighter glow
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      } else {
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = 'rgba(200, 220, 255, 0.4)';
        this.ctx.fillStyle = p.color;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
