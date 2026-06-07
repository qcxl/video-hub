/* ============================================================
   PLAYER — Video.js 播放器封装
   ============================================================ */
let vjsPlayer = null;
let vjsInitialized = false;

const player = {
  _initVjs() {
    if (vjsInitialized) return;
    const videoEl = document.getElementById('av2Video');
    vjsPlayer = videojs(videoEl, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      inactivityTimeout: 5000,
      controlBar: {
        volumePanel: { inline: false },
        pictureInPictureToggle: false,
        remainingTimeDisplay: false,
      },
    });
    vjsPlayer.on('error', () => {
      dom.playerTitle.textContent = '播放出错，请重试';
    });
    vjsInitialized = true;
  },

  async play(videoId, title) {
    dom.modalOverlay.classList.add('av2-visible');
    dom.playerTitle.textContent = title || '加载中…';

    try {
      const data = await CHANNEL_VV.fetchVideoDetail(state.token, videoId);
      if (!data) throw new Error('获取播放地址失败');
      const playUrl = data.play_hls_url || (data.href ? CONFIG.HOST + data.href : '');
      if (!playUrl) throw new Error('暂无播放地址');
      dom.playerTitle.textContent = data.title || title;

      this._initVjs();
      vjsPlayer.src({ src: playUrl, type: 'application/x-mpegURL' });
      vjsPlayer.play().catch(() => {});
    } catch (e) {
      dom.playerTitle.textContent = '播放失败: ' + e.message;
    }
  },

  close() {
    if (vjsPlayer) {
      vjsPlayer.pause();
      vjsPlayer.reset();
    }
    dom.modalOverlay.classList.remove('av2-visible');
  },
};

/* ---- 播放器 UI 事件绑定 ---- */
function bindPlayerUIClose() {
  dom.modalOverlay?.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) player.close();
  });
  dom.playerClose?.addEventListener('click', () => player.close());

  document.addEventListener('keydown', (e) => {
    if (!dom.modalOverlay?.classList.contains('av2-visible')) return;
    if (e.key === 'Escape') { player.close(); }
  });
}
