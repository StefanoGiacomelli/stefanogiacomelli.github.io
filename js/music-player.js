/**
 * music-player.js — Renders music pieces with lazy-loaded YouTube embeds
 */
export class MusicPlayer {
  constructor(i18n) {
    this.i18n = i18n;
    this.pieces = [];
  }

  async init() {
    await this.loadData();
    this.render();
    this.i18n.onChange(() => this.render());
  }

  async loadData() {
    try {
      const res = await fetch('data/music.json');
      this.pieces = await res.json();
    } catch (e) {
      console.error('Failed to load music data:', e);
    }
  }

  getLocalizedField(field) {
    if (typeof field === 'object' && field !== null) {
      return field[this.i18n.getLang()] || field.en || '';
    }
    return field || '';
  }

  render() {
    const container = document.getElementById('music-grid');
    if (!container) return;

    if (this.pieces.length === 0 || (this.pieces.length === 1 && this.pieces[0].youtube_id === 'REPLACE_WITH_YOUTUBE_VIDEO_ID')) {
      container.innerHTML = `
        <div class="music-placeholder glass-card">
          <div class="music-placeholder-icon">🎵</div>
          <p>${this.i18n.getLang() === 'it' ? 'Brani in arrivo — stay tuned!' : 'Pieces coming soon — stay tuned!'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.pieces.map((piece, idx) => {
      const title = this.getLocalizedField(piece.title);
      const desc = this.getLocalizedField(piece.description);

      const attachmentIcons = {
        maxmsp: '🔧',
        pdf: '📄',
        link: '🔗',
        audio: '🎧'
      };

      return `
        <article class="music-card glass-card">
          <div class="music-video-container" id="music-video-${idx}">
            <div class="music-thumbnail" onclick="window.__loadVideo(${idx}, '${piece.youtube_id}')">
              <img src="https://img.youtube.com/vi/${piece.youtube_id}/hqdefault.jpg" 
                   alt="${title}" loading="lazy" />
              <div class="music-play-btn">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
          <div class="music-info">
            <div class="music-header">
              <h3 class="music-title">${title}</h3>
              <span class="music-year">${piece.year}</span>
            </div>
            <p class="music-desc">${desc}</p>
            ${piece.attachments && piece.attachments.length > 0 ? `
              <div class="music-attachments">
                ${piece.attachments.map(att => `
                  <a href="${att.url}" target="_blank" rel="noopener" class="music-attachment">
                    ${attachmentIcons[att.type] || '📎'}
                    ${this.getLocalizedField(att.label)}
                  </a>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');

    // Global function for lazy loading
    window.__loadVideo = (idx, videoId) => {
      const container = document.getElementById(`music-video-${idx}`);
      container.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
          frameborder="0" 
          allow="autoplay; encrypted-media" 
          allowfullscreen
          class="music-iframe"
        ></iframe>
      `;
    };
  }
}
