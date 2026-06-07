/* ============================================================
   APP — 应用入口：事件绑定 + 启动流程
   ============================================================ */

/* ---- 事件绑定 ---- */
function bindEvents() {
  const navWrap = dom.contentNavWrap;
  let navScrollCheck = () => {
    const rect = navWrap.getBoundingClientRect();
    const isStuck = rect.top <= 0;
    navWrap.classList.toggle('av2-nav-scrolled', isStuck);
  };
  dom.main.addEventListener('scroll', navScrollCheck, { passive: true });
  window.addEventListener('scroll', navScrollCheck, { passive: true });
  requestAnimationFrame(navScrollCheck);

  // 频道点击
  dom.channelList.addEventListener('click', (e) => {
    const ch = e.target.closest('.av2-channel');
    if (!ch) return;
    const idx = parseInt(ch.dataset.ch, 10);
    if (idx >= 0 && idx !== state.activeChannel) {
      state.activeChannel = idx;
      ui.updateChannelActive(idx);
      state.page = 1;
      loadCurrentChannel();
    }
  });

  // 导航 Tab 点击
  dom.contentNav.addEventListener('click', (e) => {
    const tab = e.target.closest('.av2-nav-tab');
    if (!tab) return;
    const id = parseInt(tab.dataset.id, 10);
    if (id && id !== state.activeTabId) {
      state.activeTabId = id;
      state.page = 1;
      ui.updateNavActive(id);
      window.scrollTo(0, 0);
      dom.main.scrollTop = 0;
      loadTabContent(id);
    }
  });

  // 视频卡片点击
  dom.grid.addEventListener('click', (e) => {
    const card = e.target.closest('.av2-card, .av2-section-card');
    if (!card) return;
    const id = card.dataset.id;
    const title = card.dataset.title;
    const thumbUrl = card.dataset.thumb || '';
    if (id) player.play(id, title, thumbUrl);
  });

  // 分页
  dom.pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('.av2-page-btn');
    if (!btn || btn.disabled) return;
    const p = parseInt(btn.dataset.page, 10);
    if (p > 0 && p !== state.page) {
      state.page = p;
      window.scrollTo(0, 0);
      dom.main.scrollTop = 0;
      loadTabContent(state.activeTabId);
    }
  });

  // 移动端菜单
  dom.menuBtn.addEventListener('click', () => {
    dom.sidebar.classList.toggle('av2-open');
    dom.drawerOverlay.style.display = dom.sidebar.classList.contains('av2-open') ? 'block' : 'none';
  });
  dom.drawerOverlay.addEventListener('click', () => {
    dom.sidebar.classList.remove('av2-open');
    dom.drawerOverlay.style.display = 'none';
  });
}

/* ---- Tab 内容加载 ---- */
async function loadTabContent(tabId) {
  const navItem = state.navList.find(n => n.id === tabId);
  const cacheKey = tabId === 1 ? '_home' : tabId === 99 ? '_latest' : `tab_${tabId}_p${state.page}`;

  player.close();

  const cached = cacheGet(cacheKey);
  if (cached) {
    if (tabId === 1 || tabId === 99) {
      dom.grid.classList.add('av2-section-mode');
      dom.pagination.innerHTML = '';
    } else {
      dom.grid.classList.remove('av2-section-mode');
      ui.renderPagination(state.page, state.total, 24);
    }
    dom.grid.innerHTML = cached;
    dom.grid.querySelectorAll('.av2-thumb-img').forEach(img => {
      img.removeAttribute('data-observed');
      img.removeAttribute('data-loaded');
      img.removeAttribute('src');
      img.classList.remove('av2-loaded');
    });
    observeImages(dom.grid);
    return;
  }

  if (tabId === 1 || tabId === 99) {
    dom.grid.classList.add('av2-section-mode');
  } else {
    dom.grid.classList.remove('av2-section-mode');
  }
  ui.showSkeleton(8);
  dom.pagination.innerHTML = '';

  try {
    if (tabId === 1) {
      const pool = {};
      const promises = [
        CHANNEL_VV.fetchVideoList(state.token, { page: '1', limit: '5', type: 'good', videoType: '1', typeId: '0' }).then(r => pool.pick = r.list).catch(() => {}),
        CHANNEL_VV.fetchVideoList(state.token, { page: '1', limit: '10', type: 'hot', videoType: '1', typeId: '0' }).then(r => pool.hot = r.list).catch(() => {}),
        CHANNEL_VV.fetchVideoList(state.token, { page: '1', limit: '10', type: 'last', typeId: '0' }).then(r => pool.last = r.list).catch(() => {}),
        CHANNEL_VV.fetchHomeIndex(state.token).then(list => pool.groups = list).catch(() => {}),
      ];
      await Promise.allSettled(promises);

      const sections = [];
      if (pool.pick?.length) sections.push({ title: '每日精选', type: 'DAY', list: pool.pick });
      if (pool.hot?.length) sections.push({ title: '热门推荐', type: 'HOT', list: pool.hot });
      if (pool.last?.length) sections.push({ title: '最近更新', type: 'NEW', list: pool.last });
      if (pool.groups?.length) {
        const typeMap = { '探花': 'LABEL', '黑料': 'LABEL', '日本': 'CATE', 'ai换脸': 'LABEL' };
        pool.groups.forEach(g => {
          if (g.list?.length) sections.push({ title: g.title || g.name || '', type: typeMap[g.title || g.name] || 'CATE', list: g.list });
        });
      }
      ui.renderSections(sections);
      dom.pagination.innerHTML = '';
      cachePage(cacheKey, dom.grid.innerHTML);
      return;
    }

    if (tabId === 99) {
      const sections = await CHANNEL_VV.fetchLatestVideos(state.token);
      if (sections && sections.length > 0) {
        ui.renderSections(sections);
      } else {
        const { list } = await CHANNEL_VV.fetchVideoList(state.token, { page: '1', limit: '24', type: 'last', typeId: '0' });
        ui.renderGrid(list);
      }
      dom.pagination.innerHTML = '';
      cachePage(cacheKey, dom.grid.innerHTML);
      return;
    }

    const params = { page: String(state.page), limit: '24' };
    if (navItem?.tid !== undefined) { params.type = navItem.type; params.typeId = navItem.tid; }
    const { list, total } = await CHANNEL_VV.fetchVideoList(state.token, params);
    state.videos = list;
    state.total = total;
    ui.renderGrid(list);
    ui.renderPagination(state.page, total, 24);
    cachePage(cacheKey, dom.grid.innerHTML);
  } catch (e) {
    dom.grid.innerHTML = `<div class="av2-empty"><div class="av2-empty-icon">⚠️</div><div class="av2-empty-text">加载失败: ${esc(e.message)}</div></div>`;
  }
}

function loadCurrentChannel() {
  loadTabContent(state.activeTabId);
}

/* ---- 启动 ---- */
async function bootstrap() {
  try {
    state.token = await getToken();
    let navList = await CHANNEL_VV.fetchNavList(state.token);
    if (!navList || navList.length === 0) throw new Error('导航列表为空');

    const homeIdx = navList.findIndex(n => n.type === 'home');
    if (homeIdx !== -1) navList.splice(homeIdx + 1, 0, { id: 99, title: '最新视频', type: 'latest', tid: 0 });
    else navList.push({ id: 99, title: '最新视频', type: 'latest', tid: 0 });

    state.navList = navList;

    const channels = [
      { name: CONFIG.CHANNEL_NAME, icon: CONFIG.CHANNEL_ICON },
    ];
    ui.renderChannels(channels);
    ui.renderNavTabs(navList, 1);
    await loadTabContent(1);
  } catch (e) {
    dom.grid.innerHTML = `<div class="av2-empty"><div class="av2-empty-icon">❌</div><div class="av2-empty-text">启动失败: ${esc(e.message)}<br><button onclick="location.reload()" style="margin-top:12px;padding:8px 24px;border-radius:8px;background:#6C63FF;color:#fff;border:none;cursor:pointer;font-size:14px">重新加载</button></div></div>`;
  }
}

/* ---- 初始化 ---- */
function init() {
  cacheDom();
  bindPlayerUIClose();
  bindEvents();
  bootstrap();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
