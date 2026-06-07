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
    vjsInitialized = true;
  },

  /** 显示封面 + 加载转圈 */
  _showCover(thumbUrl, title) {
    dom.playerTitle.textContent = title;
    dom.playerCover.classList.add('av2-visible');
    // 异步加载解密后的封面图（不阻塞播放流程）
    if (thumbUrl) {
      loadEncryptedImage(thumbUrl).then(blobUrl => {
        if (blobUrl) dom.playerCoverImg.src = blobUrl;
      }).catch(() => {});
    }
  },

  /** 隐藏封面 */
  _hideCover() {
    dom.playerCover.classList.remove('av2-visible');
    dom.playerCoverImg.src = '';
  },

  async play(videoId, title, thumbUrl) {
    dom.modalOverlay.classList.add('av2-visible');
    this._showCover(thumbUrl, title || '加载中…');

    try {
      const data = await CHANNEL_VV.fetchVideoDetail(state.token, videoId);
      if (!data) throw new Error('获取播放地址失败');
      const playUrl = data.play_hls_url || (data.href ? CONFIG.HOST + data.href : '');
      if (!playUrl) throw new Error('暂无播放地址');
      dom.playerTitle.textContent = data.title || title;

      this._initVjs();
      vjsPlayer.src({ src: playUrl, type: 'application/x-mpegURL' });

      // ★ 事件监听器先于 play() 注册，避免竞态
      // 视频开始播放 → 隐藏封面
      vjsPlayer.one('playing', () => {
        this._hideCover();
      });
      // 播放出错 → 显示错误
      vjsPlayer.one('error', () => {
        dom.playerCoverLoading?.classList.remove('av2-visible');
        dom.playerTitle.textContent = '播放出错，请重试';
      });

      // 尝试播放
      const p = vjsPlayer.play();
      if (p) {
        p.catch(() => {
          // 自动播放被阻止（例如 iOS）→ 隐藏封面+转圈，用户可手动点播放
          this._hideCover();
        });
      }
    } catch (e) {
      // AbortError = 用户快速切换视频，不显示错误
      if (e.name === 'AbortError') return;
      dom.playerTitle.textContent = '播放失败: ' + e.message;
    }
  },

  close() {
    if (vjsPlayer) {
      vjsPlayer.pause();
      vjsPlayer.reset();
    }
    this._hideCover();
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
