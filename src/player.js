/* ============================================================
   PLAYER — Video.js 播放器封装
   ============================================================ */
let vjsPlayer = null;
let vjsInitialized = false;
let unmuteHintTimer = null;

/** iOS 检测 */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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

  /** 显示静音提示（仅 iOS） */
  _showUnmuteHint() {
    dom.unmuteHint?.classList.remove('av2-hidden');
    if (unmuteHintTimer) clearTimeout(unmuteHintTimer);
    // 播放后自动隐藏
    vjsPlayer.one('volumechange', () => {
      dom.unmuteHint?.classList.add('av2-hidden');
    });
    // 5 秒后自动消失
    unmuteHintTimer = setTimeout(() => {
      dom.unmuteHint?.classList.add('av2-hidden');
    }, 5000);
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

      // 事件先于 play() 注册
      vjsPlayer.one('playing', () => { this._hideCover(); });
      vjsPlayer.one('error', () => {
        dom.playerCoverLoading?.classList.remove('av2-visible');
        dom.playerTitle.textContent = '播放出错，请重试';
      });

      if (isIOS) {
        // ======== iOS 方案：静音自动播放（100% 通过） ========
        vjsPlayer.muted(true);
        const p = vjsPlayer.play();
        if (p) {
          p.then(() => {
            this._hideCover();
            this._showUnmuteHint();
          }).catch(() => { this._hideCover(); });
        }
      } else {
        // ======== 非 iOS：正常自动播放 ========
        const p = vjsPlayer.play();
        if (p) {
          p.catch(() => { this._hideCover(); });
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      dom.playerTitle.textContent = '播放失败: ' + e.message;
    }
  },

  close() {
    if (vjsPlayer) { vjsPlayer.pause(); vjsPlayer.reset(); }
    this._hideCover();
    dom.unmuteHint?.classList.add('av2-hidden');
    if (unmuteHintTimer) clearTimeout(unmuteHintTimer);
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
