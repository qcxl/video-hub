/* ============================================================
   CHANNEL: Vv视频 — 频道配置与 API 封装
   ============================================================
   新频道只需复制此文件，修改 channel 配置即可。
   ============================================================ */
const CHANNEL_VV = {
  name: 'Vv视频',
  icon: 'https://i.mji.rip/2026/06/05/4099ebe51ab7f5b877cb066087d70c5d.png',
  channel: 'dh4',

  /* ---- API 端点 ---- */
  async fetchNavList(token) {
    const resp = await apiRequest('GET', `${CONFIG.HOST}/api/v2/home/public/nav/list`, { params: { channel: this.channel, cate: 'video_long' }, token: token || undefined });
    return resp?.data?.list || [];
  },
  async fetchVideoList(token, extraParams) {
    const resp = await apiRequest('GET', `${CONFIG.HOST}/api/v2/home/public/video/list`, { params: { channel: this.channel, ...extraParams }, token: token || undefined });
    return { list: resp?.data?.list || [], total: resp?.data?.total || 0 };
  },
  async fetchVideoDetail(token, videoId) {
    const resp = await apiRequest('GET', `${CONFIG.HOST}/api/v2/home/public/video/long/detail`, { params: { channel: this.channel, id: videoId }, token: token || undefined });
    return resp?.data || null;
  },
  async fetchLatestVideos(token) {
    const resp = await apiRequest('GET', `${CONFIG.HOST}/api/video/home`, { params: { channel: this.channel }, token: token || undefined });
    return resp?.data || [];
  },
  async fetchHomeIndex(token) {
    const resp = await apiRequest('GET', `${CONFIG.HOST}/api/v2/home/public/video/home/index`, { params: { channel: this.channel, videoType: '1' }, token: token || undefined });
    return resp?.data?.list || [];
  },
};
