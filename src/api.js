/* ============================================================
   UTILITIES
   ============================================================ */
function base64ToBytes(b64) {
  let p = b64; const pad = b64.length % 4;
  if (pad) p += '='.repeat(4 - pad);
  const bin = atob(p); const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
function shiftString(s, delta) {
  const len = s.length; let r = '';
  const CHUNK = 32768;
  for (let i = 0; i < len; i += CHUNK) {
    const chunk = s.substring(i, Math.min(i + CHUNK, len));
    const cLen = chunk.length;
    const chars = new Uint16Array(cLen);
    for (let j = 0; j < cLen; j++) chars[j] = chunk.charCodeAt(j) + delta;
    r += String.fromCharCode.apply(String, chars);
  }
  return r;
}
const _esc = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function esc(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => _esc[c]); }

/* ============================================================
   DECRYPT
   ============================================================ */
const masterKeyCache = new Map();
async function getMasterKey(keyStr) {
  if (masterKeyCache.has(keyStr)) return masterKeyCache.get(keyStr);
  const mk = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyStr), { name: 'PBKDF2' }, false, ['deriveKey']);
  masterKeyCache.set(keyStr, mk);
  return mk;
}
async function decryptResponse(resp) {
  if (typeof resp.data !== 'string' || !resp.key) return resp;
  try {
    const shifted = shiftString(resp.data, -3);
    const raw = base64ToBytes(shifted);
    const salt = raw.slice(0, 16), iv = raw.slice(16, 28), ctw = raw.slice(28);
    const tag = ctw.slice(-16), ct = ctw.slice(0, -16);
    const mk = await getMasterKey(resp.key);
    const aesKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' }, mk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct); combined.set(tag, ct.length);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, combined);
    const plain = new TextDecoder().decode(dec);
    try { resp.data = JSON.parse(plain); } catch { resp.data = { plain_text: plain }; }
  } catch (e) { console.warn('[AV2解密] 失败:', e); }
  return resp;
}

/* ============================================================
   IMAGE — 加密图片加载 + LRU 缓存
   ============================================================ */
const imgCache = new Map();
const IMG_CACHE_MAX = 120;
let globalImgKey = null;
let globalObserver = null;

async function getImageKey() {
  if (globalImgKey) return globalImgKey;
  globalImgKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(CONFIG.IMAGE_KEY_ENC), { name: 'AES-CBC' }, false, ['decrypt']);
  return globalImgKey;
}
async function decryptEncImage(encData) {
  const iv = encData.slice(0, 16), ciphertext = encData.slice(16);
  const key = await getImageKey();
  const dec = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, key, ciphertext);
  const u = new Uint8Array(dec);
  return u.slice(0, u.length - u[u.length - 1]);
}
function touchCache(url) {
  if (imgCache.has(url)) {
    const val = imgCache.get(url);
    imgCache.delete(url);
    imgCache.set(url, val);
  }
}
function cacheImg(url, blobUrl) {
  touchCache(url);
  if (!imgCache.has(url)) imgCache.set(url, blobUrl);
  while (imgCache.size > IMG_CACHE_MAX) {
    const oldest = imgCache.keys().next().value;
    if (oldest === undefined) break;
    const oldBlob = imgCache.get(oldest);
    if (oldBlob) URL.revokeObjectURL(oldBlob);
    imgCache.delete(oldest);
  }
  return blobUrl;
}
async function loadEncryptedImage(url) {
  if (imgCache.has(url)) { touchCache(url); return imgCache.get(url); }
  try {
    const fetchUrl = CONFIG.USE_CORS_PROXY ? CONFIG.CORS_PROXY + encodeURIComponent(url) : url;
    const resp = await fetch(fetchUrl);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const encData = await resp.arrayBuffer();
    const decrypted = await decryptEncImage(new Uint8Array(encData));
    let mime = 'image/jpeg';
    if (url.includes('.png')) mime = 'image/png';
    else if (url.includes('.gif')) mime = 'image/gif';
    else if (url.includes('.webp')) mime = 'image/webp';
    const blob = new Blob([decrypted], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    return cacheImg(url, blobUrl);
  } catch (e) { console.warn('[AV2图片]', url.slice(-30), e.message); return null; }
}
function initObserver() {
  if (globalObserver) return globalObserver;
  globalObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const url = img.getAttribute('data-src');
      if (url && !img.dataset.loaded) loadImgFor(img, url);
    });
  }, { rootMargin: '0px 0px 200px 0px', threshold: 0.01 });
  return globalObserver;
}
async function loadImgFor(img, url) {
  if (img.dataset.loaded === 'true') return;
  img.dataset.loaded = 'true';
  try {
    const blobUrl = await loadEncryptedImage(url);
    if (blobUrl && img.parentNode) {
      img.src = blobUrl;
      if ('decode' in img) { img.decode().then(() => img.classList.add('av2-loaded')).catch(() => {}); }
      else { img.classList.add('av2-loaded'); }
    } else { img.dataset.loaded = 'false'; }
  } catch { img.dataset.loaded = 'false'; }
  finally { if (globalObserver && img) globalObserver.unobserve(img); }
}
function observeImages(container) {
  const obs = initObserver();
  container.querySelectorAll('.av2-thumb-img').forEach(img => {
    const url = img.getAttribute('data-src');
    if (!url || img.dataset.observed) return;
    img.dataset.observed = 'true';
    obs.observe(img);
  });
}

/* ============================================================
   API — 网络请求
   ============================================================ */
let currentAbort = null;
function newAbort() { if (currentAbort) currentAbort.abort(); currentAbort = new AbortController(); return currentAbort; }

async function apiRequest(method, url, opts = {}) {
  // 取消上一个请求，创建新的 AbortController
  const abortCtrl = newAbort();
  const { params, data, token } = opts;
  let fullUrl = url;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.append(k, String(v));
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + sp.toString();
  }
  if (CONFIG.USE_CORS_PROXY) fullUrl = CONFIG.CORS_PROXY + encodeURIComponent(fullUrl);
  const headers = { ...CONFIG.HEADERS };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const fetchOpts = { method, headers, signal: abortCtrl.signal };
  if (method === 'POST' && data) {
    fetchOpts.body = JSON.stringify(data);
    if (!CONFIG.USE_CORS_PROXY) headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  const resp = await fetch(fullUrl, fetchOpts);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  let result = await resp.json();
  result = await decryptResponse(result);
  return result;
}

async function getToken() {
  const cached = (() => {
    try {
      const raw = localStorage.getItem(CONFIG.TOKEN_CACHE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return (d.accessToken && d.accessTokenTtl && d.createdAt) ? d : null;
    } catch { return null; }
  })();
  if (cached && Date.now() < cached.createdAt + cached.accessTokenTtl * 1000) return cached.accessToken;
  try {
    if (cached?.refreshToken) await apiRequest('POST', CONFIG.AUTH.REFRESH, { data: { token: cached.refreshToken } }).catch(() => {});
    const fp = await generateFingerprint();
    const resp = await apiRequest('POST', CONFIG.AUTH.LOGIN, { data: { fingerPrint: fp } });
    if (resp.code === 200 && resp.data?.accessToken) {
      const d = resp.data;
      const info = { accessToken: d.accessToken, refreshToken: d.refreshToken, accessTokenTtl: d.accessTokenTtl, createdAt: Date.now() };
      localStorage.setItem(CONFIG.TOKEN_CACHE_KEY, JSON.stringify(info));
      return d.accessToken;
    }
  } catch (e) { console.warn('[AV2 Token]', e.message); }
  return cached?.accessToken || null;
}
async function generateFingerprint() {
  let seed = localStorage.getItem(CONFIG.FP_SEED_KEY);
  if (!seed) {
    const ts = Date.now();
    const rnd = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    seed = ts + '-' + rnd;
    localStorage.setItem(CONFIG.FP_SEED_KEY, seed);
  }
  const ua = navigator.userAgent, lang = navigator.language, plat = navigator.platform;
  const hw = navigator.hardwareConcurrency || 8, mtp = navigator.maxTouchPoints || 5;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sw = screen?.width || 1080, sh = screen?.height || 2400, cd = screen?.colorDepth || 24, dpr = window.devicePixelRatio || 3.0;
  const feat = `v1|${seed}|${ua}|${lang}|${plat}|${hw}|${mtp}|${tz}|${sw}x${sh}|${cd}|${dpr}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(feat));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
   PAGE CACHE
   ============================================================ */
const pageCache = new Map();
const PAGE_CACHE_MAX = 20;
const pageCacheOrder = [];
function cachePage(key, val) {
  if (pageCache.has(key)) { const i = pageCacheOrder.indexOf(key); if (i > -1) pageCacheOrder.splice(i, 1); }
  pageCache.set(key, val); pageCacheOrder.push(key);
  if (pageCacheOrder.length > PAGE_CACHE_MAX) { const oldest = pageCacheOrder.shift(); pageCache.delete(oldest); }
}
function cacheGet(key) { return pageCache.has(key) ? pageCache.get(key) : null; }
