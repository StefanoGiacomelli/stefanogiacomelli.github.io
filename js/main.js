/**
 * main.js — App entry point
 * Initializes all modules, scroll animations, and navigation
 */
import { I18n } from './i18n.js';
import { BibtexParser } from './bibtex-parser.js';
import { CanvasBackground } from './canvas-bg.js';
import { GitHubRepos } from './github-repos.js';
import { MusicPlayer } from './music-player.js';

class App {
  constructor() {
    this.i18n = new I18n();
  }

  async init() {
    // Initialize i18n first (other modules depend on it)
    await this.i18n.init();

    // Initialize all modules in parallel
    const canvas = new CanvasBackground('hero-canvas');
    canvas.init();

    const bibtex = new BibtexParser(this.i18n);
    const github = new GitHubRepos(this.i18n);
    const music = new MusicPlayer(this.i18n);
    await Promise.all([
      bibtex.init(),
      github.init(),
      music.init(),
      this.loadTimeline()
    ]);

    // Setup page interactions
    this.setupNav();
    this.setupScrollAnimations();
    this.setupTypewriter();
    this.setupSmoothScroll();
    this.setupMobileMenu();

    // Listen for language changes to re-render timeline
    this.i18n.onChange(() => this.loadTimeline());

    // Remove loading screen
    document.body.classList.add('loaded');
  }

  setupNav() {
    const nav = document.getElementById('main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      // Add/remove background blur on scroll
      if (currentScroll > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      // Highlight active section
      const sections = document.querySelectorAll('section[id]');
      let currentSection = '';
      sections.forEach(section => {
        const top = section.offsetTop - 120;
        if (currentScroll >= top) {
          currentSection = section.id;
        }
      });

      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
      });

      lastScroll = currentScroll;
    });
  }

  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Stagger children animations
          const children = entry.target.querySelectorAll('.animate-child');
          children.forEach((child, i) => {
            child.style.animationDelay = `${i * 0.1}s`;
            child.classList.add('visible');
          });
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  setupTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const getRoles = () => {
      const lang = this.i18n.getLang();
      const translations = this.i18n.translations[lang];
      return translations?.hero?.roles || ['PhD Researcher', 'Audio ML Engineer'];
    };

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let roles = getRoles();

    this.i18n.onChange(() => {
      roles = getRoles();
      roleIndex = 0;
      charIndex = 0;
      isDeleting = false;
    });

    const type = () => {
      const current = roles[roleIndex];
      if (!current) return;

      if (isDeleting) {
        el.textContent = current.substring(0, charIndex - 1);
        charIndex--;
      } else {
        el.textContent = current.substring(0, charIndex + 1);
        charIndex++;
      }

      let speed = isDeleting ? 30 : 70;

      if (!isDeleting && charIndex === current.length) {
        speed = 2000; // Pause at end
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        speed = 500; // Pause before next word
      }

      setTimeout(type, speed);
    };

    setTimeout(type, 1000);
  }

  setupSmoothScroll() {
    const scrollToTarget = (target, behavior = 'smooth') => {
      const headerOffset = 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: behavior
      });
    };

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          // Close mobile menu if open
          document.getElementById('mobile-menu')?.classList.remove('open');
          document.getElementById('menu-toggle')?.classList.remove('open');

          scrollToTarget(target);
        }
      });
    });

    // Handle URL hash on page load (from external links)
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const target = document.getElementById(id);
      if (target) {
        // Adjust scroll position after dynamic content has rendered
        setTimeout(() => scrollToTarget(target, 'auto'), 300);
        setTimeout(() => scrollToTarget(target, 'smooth'), 1000); // Failsafe for slow connections loading images
      }
    }
  }

  setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
    });
  }

  async loadTimeline() {
    try {
      const res = await fetch('data/cv-timeline.json');
      const data = await res.json();
      const container = document.getElementById('cv-timeline');
      if (!container) return;

      const lang = this.i18n.getLang();

      const getLocalized = (field) => {
        if (typeof field === 'object') return field[lang] || field.en || '';
        return field || '';
      };

      container.innerHTML = data.map((item, i) => `
        <div class="timeline-item animate-child ${i % 2 === 0 ? 'left' : 'right'}">
          <div class="timeline-dot"></div>
          <div class="timeline-content glass-card">
            <span class="timeline-year">${item.year}</span>
            <h3 class="timeline-title">${getLocalized(item.title)}</h3>
            <p class="timeline-institution">${getLocalized(item.institution)}</p>
            <p class="timeline-desc">${getLocalized(item.description)}</p>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(console.error);
});
