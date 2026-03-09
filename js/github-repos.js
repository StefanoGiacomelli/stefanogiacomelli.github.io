/**
 * github-repos.js — Fetches and renders GitHub repositories
 */
export class GitHubRepos {
  constructor(i18n) {
    this.i18n = i18n;
    this.username = 'StefanoGiacomelli';
    this.pinnedRepos = ['e2panns', 'torch_amt', 'audioset-tools', 'torch-audio-embeddings', 'torch_vggish_yamnet', 'StrumKANet'];
    this.repos = [];
  }

  async init() {
    await this.fetchRepos();
    this.render();
    this.i18n.onChange(() => this.render());
  }

  async fetchRepos() {
    try {
      // 1) Try standard GitHub API
      let githubData = [];
      try {
        const res = await fetch(`https://api.github.com/users/${this.username}/repos?sort=updated&per_page=100`);
        const apiData = await res.json();
        if (Array.isArray(apiData)) githubData = apiData;
      } catch (e) {
        console.warn('API Fetch failed:', e);
      }
      
      this.repos = githubData
        .filter(r => !r.fork && this.pinnedRepos.includes(r.name))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      // 2) Fallback: Fetch raw HTML using a CORS proxy if API is rate-limited or empty
      if (this.repos.length === 0) {
        console.warn('GitHub API returned no pinned repos (rate limit). Attempting CORS proxy scraping fallback...');
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://github.com/${this.username}`)}`;
        const htmlRes = await fetch(proxyUrl);
        
        if (htmlRes.ok) {
          const jsonVal = await htmlRes.json();
          const html = jsonVal.contents;
          const matches = html.match(/<span class="repo"[^>]*>([^<]+)<\/span>/g);
          
          if (matches) {
             this.repos = matches.map(m => {
               const titleMatch = m.match(/>([^<]+)<\/span>/);
               const name = titleMatch ? titleMatch[1].trim() : '';
               return {
                 name: name,
                 html_url: `https://github.com/${this.username}/${name}`,
                 description: 'Check out this repository on GitHub',
                 updated_at: new Date().toISOString()
               };
             }).filter(r => this.pinnedRepos.includes(r.name));
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch GitHub repos:', e);
      this.repos = [];
    }
  }

  getLanguageColor(lang) {
    const colors = {
      'Python': '#3572A5',
      'Jupyter Notebook': '#DA5B0B',
      'JavaScript': '#f1e05a',
      'HTML': '#e34c26',
      'CSS': '#563d7c',
      'TypeScript': '#3178c6',
      'C++': '#f34b7d',
      'C': '#555555',
      'MATLAB': '#e16737',
      'Shell': '#89e051',
      'Max': '#c4a79c'
    };
    return colors[lang] || '#8b949e';
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return this.i18n.getLang() === 'it' ? 'oggi' : 'today';
    if (days === 1) return this.i18n.getLang() === 'it' ? 'ieri' : 'yesterday';
    if (days < 30) return this.i18n.getLang() === 'it' ? `${days} giorni fa` : `${days} days ago`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return this.i18n.getLang() === 'it' ? `${months} mese/i fa` : `${months} month(s) ago`;
    }
    const years = Math.floor(days / 365);
    return this.i18n.getLang() === 'it' ? `${years} anno/i fa` : `${years} year(s) ago`;
  }

  render() {
    const container = document.getElementById('github-grid');
    if (!container) return;

    const lang = this.i18n.getLang();
    const starsLabel = this.i18n.get('github.stars');

    container.innerHTML = this.repos.map(repo => {
      const isPinned = this.pinnedRepos.includes(repo.name);
      const pinnedLabel = this.i18n.get('github.pinned');
      const updatedLabel = this.i18n.get('github.updated');

      return `
        <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-card glass-card ${isPinned ? 'pinned' : ''}">
          ${isPinned ? `<span class="repo-pinned-badge">📌 ${pinnedLabel}</span>` : ''}
          <h3 class="repo-name">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            ${repo.name}
          </h3>
          <p class="repo-desc">${repo.description || ''}</p>
          <div class="repo-meta">
            ${repo.language ? `
              <span class="repo-lang">
                <span class="lang-dot" style="background:${this.getLanguageColor(repo.language)}"></span>
                ${repo.language}
              </span>
            ` : ''}
            ${repo.stargazers_count > 0 ? `
              <span class="repo-stars">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ${repo.stargazers_count}
              </span>
            ` : ''}
            ${repo.forks_count > 0 ? `
              <span class="repo-forks">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><line x1="12" y1="12" x2="12" y2="15"/></svg>
                ${repo.forks_count}
              </span>
            ` : ''}
            <span class="repo-updated">${updatedLabel} ${this.formatDate(repo.updated_at)}</span>
          </div>
          ${repo.topics && repo.topics.length > 0 ? `
            <div class="repo-topics">
              ${repo.topics.slice(0, 5).map(t => `<span class="repo-topic">${t}</span>`).join('')}
            </div>
          ` : ''}
        </a>
      `;
    }).join('');
  }
}
