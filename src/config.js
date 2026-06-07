/* ============================================================
   CONFIG — 频道配置及全局状态
   ============================================================ */
const CONFIG = {
  HOST: 'https://daf.e79jtyhi.com:52000',
  CHANNEL: 'dh4',
  FP_SEED_KEY: 'fingerprint_seed',
  TOKEN_CACHE_KEY: 'token_cache',
  AUTH: {
    LOGIN: 'https://rft.qy2753c3.com:25118/api-user/login/fingerprint',
    REFRESH: 'https://rft.qy2753c3.com:25118/api-user/login/refresh_token',
  },
  CORS_PROXY: 'https://corsproxy.io/?url=',
  USE_CORS_PROXY: false,
  IMAGE_KEY_ENC: 'H0Z%7n#k$H8*M7xSE^N@8xXZPG*RZ&wY',
  HEADERS: { accept: '*/*', 'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8', },
  CHANNEL_NAME: 'Vv视频',
  CHANNEL_ICON: 'https://i.mji.rip/2026/06/05/4099ebe51ab7f5b877cb066087d70c5d.png',
};

/* ============================================================
   STATE — 全局状态
   ============================================================ */
const state = {
  navList: [],
  activeTabId: 1,
  activeChannel: 0,
  token: null,
  videos: [],
  page: 1,
  total: 0,
  pageSize: 24,
};

/* ============================================================
   DOM — 缓存
   ============================================================ */
const $ = (s) => document.querySelector(s);
const dom = {};
function cacheDom() {
  dom.menuBtn = $('#av2MenuBtn');
  dom.sidebar = $('#av2Sidebar');
  dom.channelList = $('#av2ChannelList');
  dom.drawerOverlay = $('#av2DrawerOverlay');
  dom.main = $('#av2Main');

  dom.modalOverlay = $('#av2ModalOverlay');
  dom.modalPlayer = $('#av2ModalPlayer');
  dom.video = $('#av2Video');
  dom.playerTitle = $('#av2PlayerTitle');
  dom.playerClose = $('#av2PlayerClose');
  dom.playerCover = $('#av2PlayerCover');
  dom.playerCoverImg = $('#av2PlayerCoverImg');
  dom.playerCoverLoading = $('#av2PlayerCoverLoading');
  dom.unmuteHint = $('#av2UnmuteHint');

  dom.contentNavWrap = $('#av2ContentNavWrap');
  dom.contentNav = $('#av2ContentNav');
  dom.content = $('#av2Content');
  dom.grid = $('#av2Grid');
  dom.pagination = $('#av2Pagination');
}
