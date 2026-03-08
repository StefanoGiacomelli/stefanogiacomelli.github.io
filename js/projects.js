/**
 * projects.js — Renders research project cards from JSON data
 */
export class Projects {
  constructor(i18n) {
    this.i18n = i18n;
    this.projects = [];
  }

  async init() {
    await this.loadData();
    this.render();
    this.i18n.onChange(() => this.render());
  }

  async loadData() {
    try {
      const res = await fetch('data/projects.json');
      this.projects = await res.json();
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }

  getLocalizedField(field) {
    if (typeof field === 'object' && field !== null) {
      return field[this.i18n.getLang()] || field.en || '';
    }
    return field || '';
  }

  render() {
    const container = document.getElementById('projects-grid');
    if (!container) return;

    // Featured first, then the rest
    const sorted = [...this.projects].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    container.innerHTML = sorted.map(project => {
      const desc = this.getLocalizedField(project.description);
      const viewCode = this.i18n.get('projects.view_code');
      const readPaper = this.i18n.get('projects.read_paper');
      const viewDocs = this.i18n.get('projects.view_docs');

      const placeholderIcons = {
        spectrogram: '📊',
        dataset: '📦',
        auditory: '👂',
        embedding: '🧠',
        network: '🔗',
        'music-tech': '🎸',
        spatial: '🔊',
        metaverse: '🌐'
      };

      return `
        <article class="project-card glass-card ${project.featured ? 'featured' : ''}">
          <div class="project-icon">${placeholderIcons[project.image_placeholder] || '🔬'}</div>
          <h3 class="project-title">${project.title}</h3>
          <p class="project-desc">${desc}</p>
          <div class="project-tags">
            ${project.tags.map(t => `<span class="project-tag">${t}</span>`).join('')}
          </div>
          <div class="project-links">
            ${project.github ? `
              <a href="${project.github}" target="_blank" rel="noopener" class="project-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                ${viewCode}
              </a>
            ` : ''}
            ${project.paper_doi ? `
              <a href="https://doi.org/${project.paper_doi}" target="_blank" rel="noopener" class="project-link paper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                ${readPaper}
              </a>
            ` : ''}
            ${project.docs ? `
              <a href="${project.docs}" target="_blank" rel="noopener" class="project-link docs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                ${viewDocs}
              </a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
  }
}
