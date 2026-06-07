/* ============================================================
   UI — 渲染函数
   ============================================================ */
const ui = {
  renderChannels(channels) {
    const activeIdx = state.activeChannel;
    dom.channelList.innerHTML = channels.map((ch, i) => {
      const iconHtml = ch.icon
        ? `<img class="av2-channel-icon" src="${esc(ch.icon)}" alt="" onerror="this.parentElement.innerHTML='<span class=\\'av2-channel-icon-fallback\\'>📺</span>'">`
        : `<span class="av2-channel-icon-fallback">📺</span>`;
      return `<div class="av2-channel${i === activeIdx ? ' av2-active' : ''}" data-ch="${i}">${iconHtml}${esc(ch.name)}</div>`;
    }).join('');
  },

  renderNavTabs(list, activeId) {
    dom.contentNav.innerHTML = list.map(n =>
      `<button class="av2-nav-tab${n.id === activeId ? ' av2-active' : ''}" data-id="${n.id}">${esc(n.title)}</button>`
    ).join('');
    dom.contentNavWrap?.classList.add('av2-nav-loaded');
  },

  showSkeleton(count = 8) {
    dom.grid.innerHTML = Array.from({ length: count }, () =>
      `<div class="av2-skeleton"><div class="av2-sk-thumb"></div><div class="av2-sk-info"><div class="av2-sk-line"></div><div class="av2-sk-line"></div></div></div>`
    ).join('');
  },

  renderGrid(list) {
    dom.grid.classList.remove('av2-section-mode');
    if (!list || list.length === 0) {
      dom.grid.innerHTML = '<div class="av2-empty"><div class="av2-empty-icon">📂</div><div class="av2-empty-text">暂无视频</div></div>';
      return;
    }
    dom.grid.innerHTML = list.map(v => {
      const url = v.upload_thumb || v.thumb || '';
      const label = v.label || '';
      return `<div class="av2-card" data-id="${v.id}" data-title="${esc(v.title)}" data-thumb="${esc(url)}">
        <div class="av2-thumb">
          <img class="av2-thumb-img" data-src="${esc(url)}" alt="${esc(v.title)}">
          ${label ? `<span class="av2-duration" style="left:6px;right:auto;background:var(--av2-accent)">${esc(label)}</span>` : ''}
          <div class="av2-play-overlay"><span class="av2-play-btn">▶</span></div>
        </div>
        <div class="av2-info">
          <div class="av2-title">${esc(v.title)}</div>
        </div>
      </div>`;
    }).join('');
    observeImages(dom.grid);
  },

  renderSections(sections) {
    dom.grid.classList.add('av2-section-mode');
    if (!sections || sections.length === 0) {
      dom.grid.innerHTML = '<div class="av2-empty"><div class="av2-empty-icon">📂</div><div class="av2-empty-text">暂无内容</div></div>';
      return;
    }
    dom.grid.innerHTML = sections.map(sec => {
      const list = sec.list || [];
      if (!list.length) return '';
      return `<div class="av2-section">
        <div class="av2-section-header">
          <div class="av2-section-title">${esc(sec.title || '')}</div>
          ${sec.type ? `<span class="av2-section-type">${esc(sec.type.toUpperCase())}</span>` : ''}
        </div>
        <div class="av2-section-row">
          ${list.map(v => {
            const url = v.upload_thumb || v.thumb || '';
            const label = v.label || '';
            return `<div class="av2-section-card" data-id="${v.id}" data-title="${esc(v.title)}" data-thumb="${esc(url)}">
              <div class="av2-thumb">
                <img class="av2-thumb-img" data-src="${esc(url)}" alt="${esc(v.title)}">
                ${label ? `<span class="av2-duration" style="left:6px;right:auto;background:var(--av2-accent)">${esc(label)}</span>` : ''}
                <div class="av2-play-overlay"><span class="av2-play-btn">▶</span></div>
              </div>
              <div class="av2-info">
                <div class="av2-title">${esc(v.title)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).filter(Boolean).join('');
    observeImages(dom.grid);
  },

  renderPagination(page, total, pageSize) {
    if (state.activeTabId === 1 || state.activeTabId === 99) {
      dom.pagination.innerHTML = '';
      return;
    }
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) { dom.pagination.innerHTML = ''; return; }
    let html = `<button class="av2-page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    if (start > 1) html += `<button class="av2-page-btn" data-page="1">1</button>${start > 2 ? '<span style="padding:6px 8px;color:var(--av2-text-tertiary)">…</span>' : ''}`;
    for (let i = start; i <= end; i++) html += `<button class="av2-page-btn${i === page ? ' av2-active' : ''}" data-page="${i}">${i}</button>`;
    if (end < totalPages) html += `${end < totalPages - 1 ? '<span style="padding:6px 8px;color:var(--av2-text-tertiary)">…</span>' : ''}<button class="av2-page-btn" data-page="${totalPages}">${totalPages}</button>`;
    html += `<button class="av2-page-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>›</button>`;
    dom.pagination.innerHTML = html;
  },

  updateNavActive(id) {
    dom.contentNav.querySelectorAll('.av2-nav-tab').forEach(el => el.classList.remove('av2-active'));
    const activeEl = dom.contentNav.querySelector(`.av2-nav-tab[data-id="${id}"]`);
    if (activeEl) activeEl.classList.add('av2-active');
  },

  updateChannelActive(idx) {
    dom.channelList.querySelectorAll('.av2-channel').forEach(el => el.classList.remove('av2-active'));
    const el = dom.channelList.querySelector(`.av2-channel[data-ch="${idx}"]`);
    if (el) el.classList.add('av2-active');
  },
};
