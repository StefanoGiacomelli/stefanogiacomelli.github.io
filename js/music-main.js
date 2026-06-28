import { fetchAndParseArtworks } from './tex-parser.js';
import { I18n } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu setup
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
      });
    });
  }

  // Hide loader
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }

  // Load and render concerts
  const concertsList = document.getElementById('concerts-list');
  if (concertsList) {
    concertsList.innerHTML = '<div class="text-center text-slate-400 py-8">Loading concerts...</div>';
    
    const artworks = await fetchAndParseArtworks();
    
    if (artworks.length === 0) {
      concertsList.innerHTML = '<div class="text-center text-slate-400 py-8 border border-slate-800 rounded-lg bg-surface">No concerts found. Check data/artworks.tex</div>';
      return;
    }

    concertsList.innerHTML = '';
    
    // Group by year (they are usually sorted but let's be safe)
    // Actually the TeX file is already in chronological or reverse-chronological order.
    // It's better to just render them in the order they appear to preserve the author's intent.
    // Let's render each item as a card or list item.
    
    artworks.forEach((art, index) => {
      const el = document.createElement('div');
      el.className = 'glass-card p-5 border-l-4 border-l-accent-cyan hover:border-l-accent-violet transition-colors flex flex-col md:flex-row gap-4 justify-between items-start';
      
      const contentHtml = art.items.map(item => `<div class="mb-1 text-slate-300">${item}</div>`).join('');
      
      el.innerHTML = `
        <div class="flex-1">
          <h3 class="font-heading font-semibold text-white text-lg mb-2">${art.title}</h3>
          <div class="text-sm">
            ${contentHtml}
          </div>
          ${art.location ? `<div class="mt-3 text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${art.location}
          </div>` : ''}
        </div>
        <div class="shrink-0 pt-1">
          <span class="inline-block px-3 py-1 bg-surface-light border border-slate-700 rounded-full text-sm font-mono text-accent-cyan">${art.year}</span>
        </div>
      `;
      concertsList.appendChild(el);
    });
  }
});
