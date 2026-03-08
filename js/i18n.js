/**
 * i18n.js — Bilingual IT/EN translation system
 * Uses data-i18n attributes to auto-translate DOM elements
 */
export class I18n {
  constructor() {
    this.currentLang = localStorage.getItem('lang') || 'en';
    this.translations = {};
    this.listeners = [];
  }

  async init() {
    await this.loadLanguage('en');
    await this.loadLanguage('it');
    this.applyLanguage(this.currentLang);
    this.setupToggle();
  }

  async loadLanguage(lang) {
    try {
      const res = await fetch(`data/i18n/${lang}.json`);
      this.translations[lang] = await res.json();
    } catch (e) {
      console.error(`Failed to load ${lang} translations:`, e);
    }
  }

  get(key) {
    const keys = key.split('.');
    let val = this.translations[this.currentLang];
    for (const k of keys) {
      if (val === undefined) return key;
      val = val[k];
    }
    return val || key;
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.get(key);
      if (typeof val === 'string') {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update flag buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Notify listeners
    this.listeners.forEach(cb => cb(lang));
  }

  toggle() {
    const newLang = this.currentLang === 'en' ? 'it' : 'en';
    this.applyLanguage(newLang);
  }

  setupToggle() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyLanguage(btn.dataset.lang);
      });
    });
  }

  onChange(cb) {
    this.listeners.push(cb);
  }

  getLang() {
    return this.currentLang;
  }
}
