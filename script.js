/* ============================================================
   StreamWave — script.js
   Vanilla JS · M3U parsing · HLS playback · i18n · storage
   ============================================================ */

/* -------------------- State -------------------- */
const state = {
  channels: [],          // parsed channel objects
  filteredLive: [],      // live view list
  currentView: 'home',
  currentChannel: null,
  favorites: new Set(),
  recent: [],            // array of channel ids
  lang: 'en',
  filters: {
    live: { search: '', country: '', category: '' },
    channels: { search: '', country: '', language: '', category: '', sort: 'az' }
  },
  selectedCountry: '',
  selectedCategory: '',
  playlistLoaded: false
};

const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const FALLBACK_PLAYLIST_URLS = [
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/countries/us.m3u'
];
const STORAGE_KEYS = {
  favorites: 'sw_favorites',
  recent: 'sw_recent',
  lang: 'sw_lang'
};
const MAX_RECENT = 30;

/* -------------------- DOM refs (lazy) -------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

let els = {};
function cacheEls() {
  els = {
    navList: $('#navList'),
    sidebar: $('#sidebar'),
    menuToggle: $('#menuToggle'),
    globalSearch: $('#globalSearch'),
    langSelect: $('#langSelect'),
    settingsLang: $('#settingsLang'),
    statusBar: $('#statusBar'),
    statusText: $('#statusText'),
    retryBtn: $('#retryBtn'),
    bottomNav: $('#bottomNav'),
    toast: $('#toast'),
    // player
    video: $('#videoPlayer'),
    playerLoading: $('#playerLoading'),
    playerError: $('#playerError'),
    playerErrorText: $('#playerErrorText'),
    playerRetryBtn: $('#playerRetryBtn'),
    nowPlayingLogo: $('#nowPlayingLogo'),
    nowPlayingName: $('#nowPlayingName'),
    nowPlayingMeta: $('#nowPlayingMeta'),
    prevChannelBtn: $('#prevChannelBtn'),
    nextChannelBtn: $('#nextChannelBtn'),
    favToggleBtn: $('#favToggleBtn'),
    // live
    liveList: $('#liveList'),
    liveSearch: $('#liveSearch'),
    liveCountryFilter: $('#liveCountryFilter'),
    liveCategoryFilter: $('#liveCategoryFilter'),
    liveResultCount: $('#liveResultCount'),
    // channels
    allChannelsGrid: $('#allChannelsGrid'),
    channelsSearch: $('#channelsSearch'),
    channelsCountry: $('#channelsCountry'),
    channelsLanguage: $('#channelsLanguage'),
    channelsCategory: $('#channelsCategory'),
    channelsSort: $('#channelsSort'),
    channelsResultCount: $('#channelsResultCount'),
    channelsEmpty: $('#channelsEmpty'),
    clearChannelFilters: $('#clearChannelFilters'),
    // home grids
    homePopularGrid: $('#homePopularGrid'),
    homeRecentGrid: $('#homeRecentGrid'),
    homeFavGrid: $('#homeFavGrid'),
    homeCountryChips: $('#homeCountryChips'),
    homeLanguageChips: $('#homeLanguageChips'),
    homeCategoryChips: $('#homeCategoryChips'),
    // countries / categories
    countryChipsFull: $('#countryChipsFull'),
    countryChannelGrid: $('#countryChannelGrid'),
    categoryChipsFull: $('#categoryChipsFull'),
    categoryChannelGrid: $('#categoryChannelGrid'),
    // favorites / recent
    favoritesGrid: $('#favoritesGrid'),
    favoritesEmpty: $('#favoritesEmpty'),
    recentGrid: $('#recentGrid'),
    recentEmpty: $('#recentEmpty'),
    clearFavoritesBtn: $('#clearFavoritesBtn'),
    clearHistoryBtn: $('#clearHistoryBtn'),
    // settings
    exportPrefsBtn: $('#exportPrefsBtn'),
    resetPrefsBtn: $('#resetPrefsBtn'),
    favShortcut: $('#favShortcut'),
    heroExplore: $('#heroExplore')
  };
}

/* -------------------- i18n -------------------- */
const I18N = {
  en: {
    'nav.home': 'Home', 'nav.live': 'Live TV', 'nav.channels': 'All Channels',
    'nav.countries': 'Countries', 'nav.categories': 'Categories',
    'nav.favorites': 'Favorites', 'nav.recent': 'Recently Watched', 'nav.settings': 'Settings',
    'home.popular': 'Popular Channels', 'home.recent': 'Recently Watched',
    'home.favorites': 'Your Favorites', 'home.countries': 'Browse by Country',
    'home.languages': 'Browse by Language', 'home.categories': 'Browse by Category',
    'live.channels': 'Channels', 'settings.lang': 'Interface language',
    'settings.storage': 'Stored preferences'
  },
  bn: {
    'nav.home': 'হোম', 'nav.live': 'লাইভ টিভি', 'nav.channels': 'সব চ্যানেল',
    'nav.countries': 'দেশ', 'nav.categories': 'ক্যাটাগরি',
    'nav.favorites': 'প্রিয়', 'nav.recent': 'সাম্প্রতিক', 'nav.settings': 'সেটিংস',
    'home.popular': 'জনপ্রিয় চ্যানেল', 'home.recent': 'সাম্প্রতিক দেখা',
    'home.favorites': 'আপনার প্রিয়', 'home.countries': 'দেশ অনুযায়ী',
    'home.languages': 'ভাষা অনুযায়ী', 'home.categories': 'ক্যাটাগরি অনুযায়ী',
    'live.channels': 'চ্যানেল', 'settings.lang': 'ইন্টারফেস ভাষা',
    'settings.storage': 'সংরক্ষিত পছন্দ'
  },
  hi: {
    'nav.home': 'होम', 'nav.live': 'लाइव टीवी', 'nav.channels': 'सभी चैनल',
    'nav.countries': 'देश', 'nav.categories': 'श्रेणियाँ',
    'nav.favorites': 'पसंदीदा', 'nav.recent': 'हाल में देखा', 'nav.settings': 'सेटिंग्स',
    'home.popular': 'लोकप्रिय चैनल', 'home.recent': 'हाल में देखा',
    'home.favorites': 'आपके पसंदीदा', 'home.countries': 'देश से ब्राउज़ करें',
    'home.languages': 'भाषा से ब्राउज़ करें', 'home.categories': 'श्रेणी से ब्राउज़ करें',
    'live.channels': 'चैनल', 'settings.lang': 'इंटरफ़ेस भाषा',
    'settings.storage': 'संग्रहीत प्राथमिकताएँ'
  },
  ar: {
    'nav.home': 'الرئيسية', 'nav.live': 'البث المباشر', 'nav.channels': 'كل القنوات',
    'nav.countries': 'الدول', 'nav.categories': 'الفئات',
    'nav.favorites': 'المفضلة', 'nav.recent': 'شوهد مؤخراً', 'nav.settings': 'الإعدادات',
    'home.popular': 'القنوات الشائعة', 'home.recent': 'شوهد مؤخراً',
    'home.favorites': 'مفضلاتك', 'home.countries': 'تصفح حسب الدولة',
    'home.languages': 'تصفح حسب اللغة', 'home.categories': 'تصفح حسب الفئة',
    'live.channels': 'القنوات', 'settings.lang': 'لغة الواجهة',
    'settings.storage': 'التفضيلات المحفوظة'
  }
};

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}

function applyLanguage(lang) {
  if (!I18N[lang]) lang = 'en';
  state.lang = lang;
  document.documentElement.lang = lang;
  document.body.classList.toggle('lang-bn', lang === 'bn');
  const isRTL = lang === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.body.dir = isRTL ? 'rtl' : 'ltr';
  els.langSelect.value = lang;
  if (els.settingsLang) els.settingsLang.value = lang;
  // translate elements
  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  // update placeholders
  if (els.globalSearch) els.globalSearch.placeholder = lang === 'ar' ? 'ابحث عن قنوات…' : lang === 'bn' ? 'চ্যানেল খুঁজুন…' : lang === 'hi' ? 'चैनल खोजें…' : 'Search channels…';
  savePref(STORAGE_KEYS.lang, lang);
}

/* -------------------- Storage helpers -------------------- */
function savePref(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
}
function loadPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function loadFavorites() {
  const arr = loadPref(STORAGE_KEYS.favorites, []);
  state.favorites = new Set(Array.isArray(arr) ? arr.filter(Boolean) : []);
}
function saveFavorites() {
  savePref(STORAGE_KEYS.favorites, [...state.favorites]);
}
function loadRecent() {
  const arr = loadPref(STORAGE_KEYS.recent, []);
  state.recent = Array.isArray(arr) ? arr.filter(id => typeof id === 'string') : [];
}
function saveRecent() {
  savePref(STORAGE_KEYS.recent, state.recent);
}
function addRecent(channelId) {
  state.recent = [channelId, ...state.recent.filter(id => id !== channelId)].slice(0, MAX_RECENT);
  saveRecent();
}

/* -------------------- Toast -------------------- */
let toastTimer = null;
function showToast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
}

/* -------------------- M3U parsing -------------------- */
/**
 * Parse an M3U playlist string into channel objects.
 * Handles #EXTINF with attributes and #EXTVLCOPT.
 */
function parseM3U(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const channels = [];
  let current = null;

  const attrRe = /([\w-]+)="([^"]*)"/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      current = { name: '', logo: '', group: '', country: '', language: '', tvgId: '', url: '' };
      const info = line.substring(8);
      const comma = info.indexOf(',');
      const attrPart = comma >= 0 ? info.substring(0, comma) : info;
      const namePart = comma >= 0 ? info.substring(comma + 1).trim() : '';
      let m;
      attrRe.lastIndex = 0;
      while ((m = attrRe.exec(attrPart)) !== null) {
        const key = m[1].toLowerCase();
        const val = m[2];
        if (key === 'tvg-logo') current.logo = val;
        else if (key === 'group-title') current.group = val;
        else if (key === 'tvg-country') current.country = val;
        else if (key === 'tvg-language') current.language = val;
        else if (key === 'tvg-id') current.tvgId = val;
      }
      current.name = namePart || 'Unknown Channel';
    } else if (line.startsWith('#EXTVLCOPT:')) {
      // ignore for now
    } else if (line.startsWith('#EXTGRP:')) {
      if (current) current.group = line.substring(8).trim();
    } else if (!line.startsWith('#')) {
      // stream URL
      if (current && /^https?:\/\//i.test(line)) {
        current.url = line;
        if (current.name) channels.push({ ...current });
      }
      current = null;
    }
  }

  // de-duplicate by URL (and name fallback)
  const seen = new Set();
  return channels.filter(ch => {
    const key = ch.url || ch.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* -------------------- Data loading -------------------- */
async function loadPlaylist() {
  showStatus('Loading channels from playlist…', false);
  els.retryBtn.hidden = true;
  try {
    let text = null;
    let lastErr = null;
    for (const url of [PLAYLIST_URL, ...FALLBACK_PLAYLIST_URLS]) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
        break;
      } catch (e) { lastErr = e; }
    }
    if (!text) throw lastErr || new Error('Network error');

    const parsed = parseM3U(text);
    if (parsed.length === 0) throw new Error('No channels parsed');

    // enrich with default metadata
    state.channels = parsed.map((ch, idx) => ({
      id: ch.tvgId || `ch_${idx}_${hash(ch.name + ch.url)}`,
      name: ch.name,
      url: ch.url,
      logo: ch.logo || '',
      group: ch.group || 'General',
      country: ch.country || '',
      language: ch.language || ''
    }));

    state.playlistLoaded = true;
    showStatus('', false);
    populateFilterSelects();
    renderAll();
    showToast(`Loaded ${state.channels.length} channels`);
  } catch (err) {
    console.warn('Playlist fetch failed:', err);
    showStatus('Could not load the live playlist. This may be due to CORS or network restrictions.', true);
    els.retryBtn.hidden = false;
    // load a small built-in fallback so the UI is usable
    loadFallbackChannels();
  }
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function loadFallbackChannels() {
  // A tiny sample of publicly listed streams (not guaranteed). 
  // These are used only if the playlist fetch is blocked.
  state.channels = [
    { id: 'fb_1', name: 'Sample News', url: '', logo: '', group: 'News', country: 'US', language: 'English' },
    { id: 'fb_2', name: 'Sample Sports', url: '', logo: '', group: 'Sports', country: 'UK', language: 'English' },
    { id: 'fb_3', name: 'Sample Music', url: '', logo: '', group: 'Music', country: 'FR', language: 'French' },
    { id: 'fb_4', name: 'Sample Movies', url: '', logo: '', group: 'Movies', country: 'IN', language: 'Hindi' }
  ];
  populateFilterSelects();
  renderAll();
}

function showStatus(msg, isError) {
  if (!els.statusBar) return;
  if (!msg) {
    els.statusBar.hidden = true;
    return;
  }
  els.statusBar.hidden = false;
  els.statusBar.classList.toggle('error', !!isError);
  els.statusText.textContent = msg;
}

/* -------------------- Filter option population -------------------- */
function uniqueSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateFilterSelects() {
  const countries = uniqueSorted(state.channels.map(c => c.country));
  const categories = uniqueSorted(state.channels.map(c => c.group));
  const languages = uniqueSorted(state.channels.map(c => c.language));

  fillSelect(els.liveCountryFilter, countries, 'All countries');
  fillSelect(els.liveCategoryFilter, categories, 'All categories');
  fillSelect(els.channelsCountry, countries, 'All countries');
  fillSelect(els.channelsLanguage, languages, 'All languages');
  fillSelect(els.channelsCategory, categories, 'All categories');
}

function fillSelect(select, values, allLabel) {
  if (!select) return;
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = allLabel;
  select.appendChild(all);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

/* -------------------- Rendering: Channel Cards -------------------- */
function makeChannelCard(ch, opts = {}) {
  const card = document.createElement('div');
  card.className = 'channel-card';
  card.tabIndex = 0;
  card.dataset.channelId = ch.id;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Watch ${ch.name}`);

  const logoWrap = document.createElement('div');
  logoWrap.className = 'card-logo-wrap';

  const liveDot = document.createElement('span');
  liveDot.className = 'card-live-dot';
  logoWrap.appendChild(liveDot);

  if (ch.logo) {
    const img = document.createElement('img');
    img.src = ch.logo;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      logoWrap.appendChild(makeFallbackLogo(ch.name));
    };
    logoWrap.appendChild(img);
  } else {
    logoWrap.appendChild(makeFallbackLogo(ch.name));
  }

  // favorite button
  const favBtn = document.createElement('button');
  favBtn.className = 'card-fav-btn' + (state.favorites.has(ch.id) ? ' is-fav' : '');
  favBtn.setAttribute('aria-label', state.favorites.has(ch.id) ? 'Remove from favorites' : 'Add to favorites');
  favBtn.innerHTML = `<i class="${state.favorites.has(ch.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(ch.id);
    favBtn.classList.toggle('is-fav', state.favorites.has(ch.id));
    favBtn.innerHTML = `<i class="${state.favorites.has(ch.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
    favBtn.setAttribute('aria-label', state.favorites.has(ch.id) ? 'Remove from favorites' : 'Add to favorites');
  });
  logoWrap.appendChild(favBtn);

  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = ch.name;

  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const parts = [];
  if (ch.country) parts.push(ch.country);
  if (ch.group) parts.push(ch.group);
  meta.textContent = parts.join(' · ');

  body.appendChild(title);
  body.appendChild(meta);

  card.appendChild(logoWrap);
  card.appendChild(body);

  // card click -> play
  card.addEventListener('click', () => {
    if (opts.onSelect) opts.onSelect(ch);
    else playChannel(ch);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });

  return card;
}

function makeFallbackLogo(name) {
  const div = document.createElement('div');
  div.className = 'logo-fallback';
  div.textContent = (name || '?').trim().charAt(0).toUpperCase();
  return div;
}

function renderCardGrid(container, channels, opts = {}) {
  if (!container) return;
  container.innerHTML = '';
  if (!channels.length) return;
  const frag = document.createDocumentFragment();
  channels.forEach(ch => frag.appendChild(makeChannelCard(ch, opts)));
  container.appendChild(frag);
}

/* -------------------- Rendering: Live list -------------------- */
function renderLiveList() {
  if (!els.liveList) return;
  const f = state.filters.live;
  let list = state.channels.filter(ch => {
    if (f.search && !ch.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.country && ch.country !== f.country) return false;
    if (f.category && ch.group !== f.category) return false;
    return true;
  });
  state.filteredLive = list;
  els.liveResultCount.textContent = `${list.length}`;
  els.liveList.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(ch => {
    const item = document.createElement('button');
    item.className = 'live-item' + (state.currentChannel && state.currentChannel.id === ch.id ? ' active' : '');
    item.dataset.channelId = ch.id;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', state.currentChannel && state.currentChannel.id === ch.id ? 'true' : 'false');

    if (ch.logo) {
      const img = document.createElement('img');
      img.src = ch.logo;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => { img.remove(); item.prepend(makeLiveFallback(ch.name)); };
      item.appendChild(img);
    } else {
      item.prepend(makeLiveFallback(ch.name));
    }

    const info = document.createElement('div');
    info.className = 'live-item-info';
    const name = document.createElement('div');
    name.className = 'live-item-name';
    name.textContent = ch.name;
    const meta = document.createElement('div');
    meta.className = 'live-item-meta';
    meta.textContent = [ch.country, ch.group].filter(Boolean).join(' · ');
    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(info);

    const dot = document.createElement('span');
    dot.className = 'li-live';
    item.appendChild(dot);

    item.addEventListener('click', () => playChannel(ch));
    frag.appendChild(item);
  });
  els.liveList.appendChild(frag);
}

function makeLiveFallback(name) {
  const d = document.createElement('div');
  d.className = 'li-fallback';
  d.textContent = (name || '?').charAt(0).toUpperCase();
  return d;
}

/* -------------------- Rendering: All views -------------------- */
function renderHome() {
  // popular: take first 12 (or by some heuristic — just first 12)
  renderCardGrid(els.homePopularGrid, state.channels.slice(0, 12));
  renderCardGrid(els.homeRecentGrid, getRecentChannels().slice(0, 6));
  renderCardGrid(els.homeFavGrid, getFavoriteChannels().slice(0, 6));

  // country chips
  renderChipRow(els.homeCountryChips, uniqueSorted(state.channels.map(c => c.country)).slice(0, 18), 'country');
  renderChipRow(els.homeLanguageChips, uniqueSorted(state.channels.map(c => c.language)).slice(0, 18), 'language');
  renderChipRow(els.homeCategoryChips, uniqueSorted(state.channels.map(c => c.group)).slice(0, 18), 'category');
}

function renderChipRow(container, values, type) {
  if (!container) return;
  container.innerHTML = '';
  values.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = v;
    btn.addEventListener('click', () => {
      if (type === 'country') { state.selectedCountry = v; switchView('countries'); }
      else if (type === 'category') { state.selectedCategory = v; switchView('categories'); }
      else if (type === 'language') { switchView('channels'); els.channelsLanguage.value = v; state.filters.channels.language = v; renderAllChannels(); }
    });
    container.appendChild(btn);
  });
}

function renderAllChannels() {
  const f = state.filters.channels;
  let list = state.channels.filter(ch => {
    if (f.search && !ch.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.country && ch.country !== f.country) return false;
    if (f.language && ch.language !== f.language) return false;
    if (f.category && ch.group !== f.category) return false;
    return true;
  });
  if (f.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => b.name.localeCompare(a.name));

  els.channelsResultCount.textContent = `${list.length}`;
  renderCardGrid(els.allChannelsGrid, list);
  els.channelsEmpty.hidden = list.length > 0;
}

function renderCountriesView() {
  const countries = uniqueSorted(state.channels.map(c => c.country));
  els.countryChipsFull.innerHTML = '';
  countries.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.selectedCountry === c ? ' active' : '');
    b.textContent = c;
    b.addEventListener('click', () => {
      state.selectedCountry = c;
      renderCountriesView();
    });
    els.countryChipsFull.appendChild(b);
  });
  const list = state.selectedCountry
    ? state.channels.filter(ch => ch.country === state.selectedCountry)
    : [];
  renderCardGrid(els.countryChannelGrid, list);
}

function renderCategoriesView() {
  const cats = uniqueSorted(state.channels.map(c => c.group));
  els.categoryChipsFull.innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.selectedCategory === c ? ' active' : '');
    b.textContent = c;
    b.addEventListener('click', () => {
      state.selectedCategory = c;
      renderCategoriesView();
    });
    els.categoryChipsFull.appendChild(b);
  });
  const list = state.selectedCategory
    ? state.channels.filter(ch => ch.group === state.selectedCategory)
    : [];
  renderCardGrid(els.categoryChannelGrid, list);
}

function getFavoriteChannels() {
  return state.channels.filter(ch => state.favorites.has(ch.id));
}
function getRecentChannels() {
  return state.recent
    .map(id => state.channels.find(ch => ch.id === id))
    .filter(Boolean);
}

function renderFavoritesView() {
  const list = getFavoriteChannels();
  renderCardGrid(els.favoritesGrid, list);
  els.favoritesEmpty.hidden = list.length > 0;
}
function renderRecentView() {
  const list = getRecentChannels();
  renderCardGrid(els.recentGrid, list);
  els.recentEmpty.hidden = list.length > 0;
}

/* -------------------- Master render -------------------- */
function renderAll() {
  renderHome();
  renderLiveList();
  renderAllChannels();
  renderCountriesView();
  renderCategoriesView();
  renderFavoritesView();
  renderRecentView();
}

/* -------------------- Player logic -------------------- */
let hlsInstance = null;

function validateStreamUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url, location.href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function playChannel(ch) {
  if (!ch) return;
  state.currentChannel = ch;
  addRecent(ch.id);
  // update now playing UI
  els.nowPlayingName.textContent = ch.name;
  els.nowPlayingMeta.textContent = [ch.country, ch.group, ch.language].filter(Boolean).join(' · ') || 'Live channel';
  if (ch.logo) {
    els.nowPlayingLogo.src = ch.logo;
    els.nowPlayingLogo.style.display = '';
    els.nowPlayingLogo.onerror = () => { els.nowPlayingLogo.style.display = 'none'; };
  } else {
    els.nowPlayingLogo.style.display = 'none';
  }
  // favorite button
  els.favToggleBtn.innerHTML = `<i class="${state.favorites.has(ch.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
  els.favToggleBtn.setAttribute('aria-label', state.favorites.has(ch.id) ? 'Remove from favorites' : 'Add to favorites');

  // switch view to live
  switchView('live');
  renderLiveList();
  renderRecentView();

  // playback
  const video = els.video;
  const url = ch.url;

  // clear previous
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.pause();
  video.removeAttribute('src');
  video.load();

  els.playerError.hidden = true;
  els.playerLoading.hidden = false;

  if (!validateStreamUrl(url)) {
    showPlayerError('This channel does not have a valid stream URL.');
    return;
  }

  const isHls = /\.m3u8($|\?)/i.test(url);

  if (isHls && window.Hls && Hls.isSupported()) {
    hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      els.playerLoading.hidden = true;
      video.play().catch(() => { /* autoplay blocked */ });
    });
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hlsInstance.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance.recoverMediaError();
            break;
          default:
            showPlayerError('Stream error. The channel may be offline or geo-blocked.');
            break;
        }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      els.playerLoading.hidden = true;
      video.play().catch(() => {});
    }, { once: true });
  } else {
    // try native for non-HLS
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      els.playerLoading.hidden = true;
      video.play().catch(() => {});
    }, { once: true });
    video.addEventListener('error', () => {
      showPlayerError('This stream format is not supported or the stream is offline.');
    }, { once: true });
  }

  // timeout safety
  setTimeout(() => {
    if (!els.playerLoading.hidden) {
      // still loading — no error yet, leave spinner
    }
  }, 15000);
}

function showPlayerError(msg) {
  els.playerLoading.hidden = true;
  els.playerError.hidden = false;
  els.playerErrorText.textContent = msg;
}

function retryPlayback() {
  if (state.currentChannel) playChannel(state.currentChannel);
}

/* -------------------- Favorites & history -------------------- */
function toggleFavorite(channelId) {
  if (state.favorites.has(channelId)) state.favorites.delete(channelId);
  else state.favorites.add(channelId);
  saveFavorites();
  renderFavoritesView();
  renderHome();
  renderAllChannels();
  // update live list favorites indicator not needed
  if (state.currentChannel && state.currentChannel.id === channelId) {
    els.favToggleBtn.innerHTML = `<i class="${state.favorites.has(channelId) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
  }
}

/* -------------------- View switching -------------------- */
function switchView(view) {
  state.currentView = view;
  $$('.view').forEach(v => v.hidden = true);
  const target = document.getElementById(`view-${view}`);
  if (target) target.hidden = false;

  // nav active states
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.bn-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

  // close mobile sidebar
  els.sidebar.classList.remove('open');
  els.menuToggle.setAttribute('aria-expanded', 'false');

  // refresh dynamic views
  if (view === 'home') renderHome();
  if (view === 'live') renderLiveList();
  if (view === 'channels') renderAllChannels();
  if (view === 'countries') renderCountriesView();
  if (view === 'categories') renderCategoriesView();
  if (view === 'favorites') renderFavoritesView();
  if (view === 'recent') renderRecentView();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* -------------------- Search / filter handlers -------------------- */
function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function setupFilters() {
  // global search -> all channels view
  els.globalSearch.addEventListener('input', debounce(() => {
    state.filters.channels.search = els.globalSearch.value.trim();
    els.channelsSearch.value = els.globalSearch.value;
    switchView('channels');
    renderAllChannels();
  }, 300));

  // live filters
  els.liveSearch.addEventListener('input', debounce(() => {
    state.filters.live.search = els.liveSearch.value.trim();
    renderLiveList();
  }, 200));
  els.liveCountryFilter.addEventListener('change', () => {
    state.filters.live.country = els.liveCountryFilter.value;
    renderLiveList();
  });
  els.liveCategoryFilter.addEventListener('change', () => {
    state.filters.live.category = els.liveCategoryFilter.value;
    renderLiveList();
  });

  // all channels filters
  els.channelsSearch.addEventListener('input', debounce(() => {
    state.filters.channels.search = els.channelsSearch.value.trim();
    renderAllChannels();
  }, 200));
  els.channelsCountry.addEventListener('change', () => {
    state.filters.channels.country = els.channelsCountry.value;
    renderAllChannels();
  });
  els.channelsLanguage.addEventListener('change', () => {
    state.filters.channels.language = els.channelsLanguage.value;
    renderAllChannels();
  });
  els.channelsCategory.addEventListener('change', () => {
    state.filters.channels.category = els.channelsCategory.value;
    renderAllChannels();
  });
  els.channelsSort.addEventListener('change', () => {
    state.filters.channels.sort = els.channelsSort.value;
    renderAllChannels();
  });
  els.clearChannelFilters.addEventListener('click', () => {
    state.filters.channels = { search: '', country: '', language: '', category: '', sort: 'az' };
    els.channelsSearch.value = '';
    els.channelsCountry.value = '';
    els.channelsLanguage.value = '';
    els.channelsCategory.value = '';
    els.channelsSort.value = 'az';
    renderAllChannels();
  });

  // clear favorites / history
  els.clearFavoritesBtn.addEventListener('click', () => {
    if (confirm('Clear all favorites?')) {
      state.favorites.clear();
      saveFavorites();
      renderFavoritesView();
      renderHome();
      renderAllChannels();
    }
  });
  els.clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear watch history?')) {
      state.recent = [];
      saveRecent();
      renderRecentView();
      renderHome();
    }
  });

  // settings export / reset
  els.exportPrefsBtn.addEventListener('click', () => {
    const data = {
      favorites: [...state.favorites],
      recent: state.recent,
      lang: state.lang
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'streamwave-preferences.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  els.resetPrefsBtn.addEventListener('click', () => {
    if (confirm('Reset all preferences? This clears favorites, history, and language.')) {
      try {
        localStorage.removeItem(STORAGE_KEYS.favorites);
        localStorage.removeItem(STORAGE_KEYS.recent);
        localStorage.removeItem(STORAGE_KEYS.lang);
      } catch {}
      state.favorites.clear();
      state.recent = [];
      applyLanguage('en');
      renderAll();
      showToast('Preferences reset');
    }
  });
}

/* -------------------- Navigation & keyboard -------------------- */
function setupNavigation() {
  // sidebar & bottom nav
  document.body.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-view]');
    if (navBtn && (navBtn.classList.contains('nav-btn') || navBtn.classList.contains('bn-btn') || navBtn.id === 'heroExplore')) {
      e.preventDefault();
      switchView(navBtn.dataset.view);
    }
  });

  els.menuToggle.addEventListener('click', () => {
    const open = els.sidebar.classList.toggle('open');
    els.menuToggle.setAttribute('aria-expanded', String(open));
  });

  els.brandHome = $('#brandHome');
  if (els.brandHome) els.brandHome.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });

  els.favShortcut.addEventListener('click', () => switchView('favorites'));

  // language
  els.langSelect.addEventListener('change', () => applyLanguage(els.langSelect.value));
  if (els.settingsLang) els.settingsLang.addEventListener('change', () => applyLanguage(els.settingsLang.value));

  // player controls
  els.prevChannelBtn.addEventListener('click', () => navigateChannel(-1));
  els.nextChannelBtn.addEventListener('click', () => navigateChannel(1));
  els.playerRetryBtn.addEventListener('click', retryPlayback);
  els.retryBtn.addEventListener('click', loadPlaylist);

  els.favToggleBtn.addEventListener('click', () => {
    if (state.currentChannel) toggleFavorite(state.currentChannel.id);
  });

  // TV keyboard detection
  const markTV = () => document.body.classList.add('tv-mode');
  window.addEventListener('keydown', markTV, { once: true });
  setTimeout(markTV, 2000);

  // global keyboard: Escape closes sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.sidebar.classList.remove('open');
      els.menuToggle.setAttribute('aria-expanded', 'false');
      if (document.fullscreenElement) document.exitFullscreen();
    }
  });
}

function navigateChannel(dir) {
  const list = state.filteredLive.length ? state.filteredLive : state.channels;
  if (!list.length) return;
  let idx = list.findIndex(c => c.id === (state.currentChannel && state.currentChannel.id));
  if (idx === -1) idx = 0;
  idx = (idx + dir + list.length) % list.length;
  playChannel(list[idx]);
}

/* -------------------- Init -------------------- */
function init() {
  cacheEls();
  loadFavorites();
  loadRecent();
  const savedLang = loadPref(STORAGE_KEYS.lang, 'en');
  applyLanguage(savedLang);
  setupNavigation();
  setupFilters();
  switchView('home');
  loadPlaylist();
}

document.addEventListener('DOMContentLoaded', init);