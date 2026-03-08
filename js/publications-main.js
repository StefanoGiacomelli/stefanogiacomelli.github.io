/**
 * publications-main.js — Entry point for publications.html
 * Initialises i18n + BibtexParser (full year-grouped mode)
 */
import { I18n } from './i18n.js';
import { BibtexParser } from './bibtex-parser.js';

class PublicationsApp {
  constructor() {
    this.i18n = new I18n();
  }

  async init() {
    await this.i18n.init();

    const bibtex = new BibtexParser(this.i18n);
    await bibtex.init();

    this.setupNav();
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupScrollAnimations();

    document.body.classList.add('loaded');
  }

  setupNav() {
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const menu   = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PublicationsApp().init().catch(console.error);
});
