const STORAGE = {
  learned: 'learnedWords',
  bank: 'wordBank',
  favorites: 'favoriteWords',
  review: 'reviewState',
  streak: 'streakState',
  seenAchievements: 'seenAchievements',
  stats: 'studyStats',
  theme: 'theme'
};

const todayStr = () => new Date().toLocaleDateString('sv-SE');
const yesterdayStr = () => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('sv-SE');
};
const safeParse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const loadSet = (key) => new Set(safeParse(localStorage.getItem(key), []));
const saveSet = (key, set) => localStorage.setItem(key, JSON.stringify([...set]));
const loadObj = (key, fallback) => safeParse(localStorage.getItem(key), fallback);
const saveObj = (key, obj) => localStorage.setItem(key, JSON.stringify(obj));

let app = {
  all: typeof vocabulary !== 'undefined' ? vocabulary : [],
  filtered: [],
  idx: 0,
  currentCategory: 'all',
  searchQuery: '',
  theme: localStorage.getItem(STORAGE.theme) || 'dark',
  pages: { lexicon: 1, bank: 1, main: 1, favorites: 1 },
  ITEMS_PER_PAGE: 10,
  learned: loadSet(STORAGE.learned),
  bank: loadSet(STORAGE.bank),
  favorites: loadSet(STORAGE.favorites),
  review: loadObj(STORAGE.review, {}),
  streak: loadObj(STORAGE.streak, { count: 0, best: 0, lastDate: '' }),
  seenAchievements: loadSet(STORAGE.seenAchievements),
  stats: loadObj(STORAGE.stats, { answers: 0, correct: 0, perfects: 0, placementBest: null }),
  mode: 'flashcards',
  quiz: { type: '', title: '', source: [], questions: [], idx: 0, score: 0, answered: false },
  sentence: { current: null, correct: '', pool: [], feedbackShown: false },
  placement: { level: '', result: 0 },
};

const getIPA = (text) => {
  if (!text) return '';
  let phon = text.toLowerCase()
    .replace(/sch/g, 'შ').replace(/ch/g, 'ხ').replace(/st/g, 'შტ').replace(/sp/g, 'შპ')
    .replace(/eu/g, 'ოი').replace(/äu/g, 'ოი').replace(/ei/g, 'აი').replace(/ie/g, 'იი')
    .replace(/au/g, 'აუ').replace(/ph/g, 'ფ').replace(/qu/g, 'კვ').replace(/th/g, 'თ')
    .replace(/ck/g, 'კ').replace(/ig/g, 'იხ')
    .replace(/z/g, 'ც').replace(/s/g, 'ზ').replace(/v/g, 'ფ').replace(/w/g, 'ვ')
    .replace(/j/g, 'ი').replace(/y/g, 'ი').replace(/ä/g, 'ე').replace(/ö/g, 'ო')
    .replace(/ü/g, 'იუ').replace(/ß/g, 'ს')
    .replace(/a/g, 'ა').replace(/b/g, 'ბ').replace(/c/g, 'კ').replace(/d/g, 'დ')
    .replace(/e/g, 'ე').replace(/f/g, 'ფ').replace(/g/g, 'გ').replace(/h/g, 'ჰ')
    .replace(/i/g, 'ი').replace(/k/g, 'კ').replace(/l/g, 'ლ').replace(/m/g, 'მ')
    .replace(/n/g, 'ნ').replace(/o/g, 'ო').replace(/p/g, 'პ').replace(/r/g, 'რ')
    .replace(/t/g, 'ტ').replace(/u/g, 'უ').replace(/x/g, 'ქს');
  return `[${phon}]`;
};

const articleOf = (word) => {
  const first = (word || '').trim().split(/\s+/)[0].toLowerCase();
  if (['der', 'die', 'das'].includes(first)) return first;
  return null;
};

const wordLabel = (w) => `${w.german} — ${w.translation}`;

function showToast(msg, kind = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderLeft = `5px solid ${kind === 'success' ? 'var(--success)' : kind === 'danger' ? 'var(--danger)' : 'var(--yellow)'}`;
  t.classList.add('active');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('active'), 2200);
}

function todayMs(dateStr) {
  if (!dateStr) return 0;
  return new Date(dateStr + 'T00:00:00').getTime();
}

function isDue(wordId) {
  const meta = app.review[wordId];
  if (!meta || !meta.due) return false;
  return todayMs(meta.due) <= todayMs(todayStr());
}

function scheduleReview(wordId, correct) {
  const now = new Date();
  const current = app.review[wordId] || { interval: 1, ease: 2.3, due: todayStr(), lapses: 0 };
  if (correct) {
    const nextInterval = Math.min(60, Math.max(1, Math.round(current.interval * current.ease)));
    current.interval = nextInterval;
    current.ease = Math.min(2.8, current.ease + 0.08);
    current.due = addDays(todayStr(), nextInterval);
  } else {
    current.lapses = (current.lapses || 0) + 1;
    current.interval = 1;
    current.ease = Math.max(1.3, current.ease - 0.2);
    current.due = addDays(todayStr(), 1);
  }
  app.review[wordId] = current;
  saveObj(STORAGE.review, app.review);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('sv-SE');
}

function updateStreak() {
  const today = todayStr();
  if (app.streak.lastDate === today) return;
  if (app.streak.lastDate === yesterdayStr()) {
    app.streak.count += 1;
  } else {
    app.streak.count = 1;
  }
  app.streak.best = Math.max(app.streak.best || 0, app.streak.count);
  app.streak.lastDate = today;
  saveObj(STORAGE.streak, app.streak);
}

function updateStats(correct, total = 1) {
  app.stats.answers += total;
  if (correct) app.stats.correct += 1;
  saveObj(STORAGE.stats, app.stats);
}

function updateAchievements() {
  if (typeof achievements === 'undefined') return;
  const current = {
    learned: app.learned.size,
    streak: app.streak.count,
    perfectTest: (app.quiz.type === 'placement' ? app.quiz.score === app.quiz.questions.length : false),
    favorites: app.favorites.size
  };
  achievements.forEach(a => {
    if (!app.seenAchievements.has(a.id) && a.condition(current)) {
      app.seenAchievements.add(a.id);
      saveSet(STORAGE.seenAchievements, app.seenAchievements);
      confettiBurst();
      showToast(`🎉 მიღწევა გახსნილია: ${a.title}`);
    }
  });
}

function confettiBurst() {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const count = 28;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = (-10 - Math.random() * 20) + 'px';
    el.style.background = ['#00f2fe', '#10b981', '#facc15', '#ef4444', '#ffffff'][Math.floor(Math.random() * 5)];
    el.style.animationDelay = (Math.random() * 120) + 'ms';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

function showModalFeedback(containerId, html, kind = 'neutral') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.className = `answer-feedback ${kind === 'good' ? 'feedback-good' : kind === 'bad' ? 'feedback-bad' : 'feedback-neutral'}`;
  el.innerHTML = html;
}

function speakText(text, lang = 'de-DE') {
  if (!('speechSynthesis' in window) || !text) {
    showToast('ხმის მხარდაჭერა არ არის ხელმისაწვდომი', 'info');
    return;
  }
  const utter = new SpeechSynthesisUtterance(text.replace(/^\s+|\s+$/g, ''));
  utter.lang = lang;
  utter.rate = 0.93;
  utter.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function currentWord() {
  return app.filtered[app.idx];
}

function syncStorage() {
  saveSet(STORAGE.learned, app.learned);
  saveSet(STORAGE.bank, app.bank);
  saveSet(STORAGE.favorites, app.favorites);
  saveObj(STORAGE.review, app.review);
  saveObj(STORAGE.streak, app.streak);
  saveSet(STORAGE.seenAchievements, app.seenAchievements);
  saveObj(STORAGE.stats, app.stats);
  localStorage.setItem(STORAGE.theme, app.theme);
}

function decorateAnsweredQuestion() {
  const q = app.quiz.questions[app.quiz.idx];
  if (!q) return;
  const buttons = document.querySelectorAll('.quiz-option');
  buttons.forEach((btn, idx) => {
    const opt = q.options[idx];
    btn.disabled = true;
    btn.classList.remove('correct', 'wrong');
    if (opt === q.answer) btn.classList.add('correct');
    if (app.quiz.answeredIndex === idx && opt !== q.answer) btn.classList.add('wrong');
  });
}

function registerWrongAnswer(wordId) {
  if (!wordId) return;
  app.bank.add(wordId);
  app.learned.delete(wordId) ? null : null;
  app.bank.add(wordId);
  saveSet(STORAGE.bank, app.bank);
}

function touchWord(wordId, correct) {
  scheduleReview(wordId, correct);
  updateStreak();
  updateStats(correct, 1);
}

function maybeShowCorrectFeedback(selected, correct, questionLabel) {
  if (selected === correct) {
    return `<strong>სწორია.</strong> ${questionLabel ? `<div class="mt-10">${questionLabel}</div>` : ''}`;
  }
  return `<strong>არასწორია.</strong> არჩეული პასუხი: <span class="feedback-bad">${escapeHtml(selected)}</span><br>სწორი პასუხი: <span class="feedback-good">${escapeHtml(correct)}</span>${questionLabel ? `<div class="mt-10">${questionLabel}</div>` : ''}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getDueCount() {
  return app.all.filter(w => isDue(w.id)).length;
}

function getDeckForCurrentMode() {
  let source = app.currentCategory === 'all' ? [...app.all] : app.all.filter(w => w.category === app.currentCategory);
  if (app.searchQuery) {
    source = source.filter(w => w.german.toLowerCase().includes(app.searchQuery) || w.translation.toLowerCase().includes(app.searchQuery));
  }
  const dueFirst = source.sort((a, b) => {
    const da = app.review[a.id]?.due ? todayMs(app.review[a.id].due) : Infinity;
    const db = app.review[b.id]?.due ? todayMs(app.review[b.id].due) : Infinity;
    return da - db;
  });
  return dueFirst;
}

function applyTheme() {
  document.body.classList.toggle('light-mode', app.theme === 'light');
}

function init() {
  applyTheme();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  app.filtered = getDeckForCurrentMode();
  initCategories();
  initGrammar();
  refreshAllViews();
  renderCard();
  updateStatusBlocks();
  const card = document.getElementById('mainCard');
  if (card) {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      card.classList.toggle('flipped');
    });
  }
  updateAchievements();
}

document.addEventListener('DOMContentLoaded', init);

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${viewId}`);
  if (el) el.classList.add('active');
  closeSidebars();
  document.getElementById('main-content').scrollTop = 0;
  const headerTitle = {
    'flashcards': 'Deutsch Pro',
    'category-list': 'ლექსიკონი',
    'wordbank': 'სიტყვების ბანკი',
    'favorites': 'ფავორიტები',
    'profile': 'პროფილი',
    'plan': 'დღიური გეგმა',
    'grammar': 'გრამატიკის მინიშნება',
    'quiz': app.quiz.title || 'ვიქტორინა',
    'sentence': 'წინადადებების აწყობა'
  }[viewId] || 'Deutsch Pro';
  document.getElementById('headerTitle').textContent = headerTitle;
}

function switchView(viewId, navBtn = null) {
  showView(viewId);
  if (navBtn) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navBtn.classList.add('active');
  }
}

function toggleSidebar(side) {
  const s = document.getElementById('sidebar' + side);
  const o = document.getElementById('overlay');
  const isActive = s.classList.contains('active');
  closeSidebars();
  if (!isActive) {
    s.classList.add('active');
    o.classList.add('active');
  }
}

function closeSidebars() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('active'));
  document.getElementById('overlay').classList.remove('active');
}

function renderPaginated(data, containerId, pagId, pageKey, renderFn) {
  const container = document.getElementById(containerId);
  const pagContainer = document.getElementById(pagId);
  if (!container || !pagContainer) return;
  const totalPages = Math.max(1, Math.ceil(data.length / app.ITEMS_PER_PAGE));
  if (app.pages[pageKey] > totalPages) app.pages[pageKey] = totalPages;
  if (app.pages[pageKey] < 1) app.pages[pageKey] = 1;
  const start = (app.pages[pageKey] - 1) * app.ITEMS_PER_PAGE;
  const items = data.slice(start, start + app.ITEMS_PER_PAGE);
  container.innerHTML = items.length ? items.map(renderFn).join('') : "<p class='text-center mt-20 text-dim'>სია ცარიელია</p>";
  pagContainer.innerHTML = totalPages > 1 ? `
    <button class="pag-btn" onclick="changePage('${pageKey}', -1)" ${app.pages[pageKey] === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
    <span class="badge">${app.pages[pageKey]} / ${totalPages}</span>
    <button class="pag-btn" onclick="changePage('${pageKey}', 1)" ${app.pages[pageKey] === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
  ` : '';
}

function changePage(key, dir) {
  app.pages[key] += dir;
  if (key === 'lexicon') openCategoryList(app.currentCategory, null, true);
  else if (key === 'bank') openWordBank(true);
  else if (key === 'favorites') openFavorites(true);
  else if (key === 'main') renderMainLearned();
  document.getElementById('main-content').scrollTop = 0;
}

function refreshAllViews() {
  renderMainLearned();
  renderCurrentLists();
  renderFavorites();
  renderWordBank();
  renderProfile();
  renderDailyPlan();
}

function renderCurrentLists() {
  if (document.getElementById('catWordsList')) openCategoryList(app.currentCategory, null, true);
}

function renderCard() {
  if (!app.filtered.length) app.filtered = getDeckForCurrentMode();
  const w = app.filtered[app.idx % Math.max(1, app.filtered.length)];
  if (!w) return;
  document.getElementById('wordGer').textContent = w.german;
  document.getElementById('wordPhonGer').textContent = getIPA(w.german);
  document.getElementById('cardLevel').textContent = w.level || 'A1';
  document.getElementById('cardCat').textContent = categoryNames[w.category] || w.category || 'კატეგორია';
  document.getElementById('wordGeo').textContent = w.translation;
  document.getElementById('exGer').textContent = w.example || '';
  document.getElementById('exPhon').textContent = getIPA(w.example);
  document.getElementById('exGeo').textContent = w.exampleTrans || '';
  document.getElementById('favIcon').className = app.favorites.has(w.id) ? 'fas fa-star' : 'far fa-star';
  document.getElementById('mainCard').classList.remove('flipped');
  document.getElementById('deckBadge').textContent = isDue(w.id) ? 'დღეს შესასწავლი' : 'ბარათები';
  document.getElementById('reviewBadge').textContent = `SRS: ${app.review[w.id]?.due || 'ახალი'}`;
}

function nextCard() { if (!app.filtered.length) return; app.idx = (app.idx + 1) % app.filtered.length; renderCard(); }
function prevCard() { if (!app.filtered.length) return; app.idx = (app.idx - 1 + app.filtered.length) % app.filtered.length; renderCard(); }

function markLearned() {
  const w = currentWord();
  if (!w) return;
  app.learned.add(w.id);
  saveSet(STORAGE.learned, app.learned);
  updateStreak();
  scheduleReview(w.id, true);
  showToast('✓ ვისწავლე');
  updateAchievements();
  renderMainLearned();
  updateStatusBlocks();
  nextCard();
}

function addCurrentToBank() {
  const w = currentWord();
  if (!w) return;
  app.bank.add(w.id);
  saveSet(STORAGE.bank, app.bank);
  showToast('შეინახა ბანკში', 'info');
  renderWordBank();
  updateStatusBlocks();
}

function toggleFavoriteCurrent() {
  const w = currentWord();
  if (!w) return;
  if (app.favorites.has(w.id)) app.favorites.delete(w.id); else app.favorites.add(w.id);
  saveSet(STORAGE.favorites, app.favorites);
  showToast(app.favorites.has(w.id) ? 'ფავორიტებში დაემატა' : 'ფავორიტებიდან წაიშალა', 'info');
  renderCard();
  renderFavorites();
  renderProfile();
  updateAchievements();
}

function speakCurrentWord() {
  const w = currentWord();
  if (!w) return;
  speakText(w.german);
}

function showHintForCurrent() {
  const w = currentWord();
  if (!w) return;
  const art = articleOf(w.german);
  let hint = `${w.german}: `;
  if (art) hint += `არტიკლი — ${art}. `;
  if ((w.category || '') === 'verbs') hint += 'ზმნები იცვლება პირისა და რიცხვის მიხედვით.';
  else if (art) hint += 'სიტყვა არტიკლთან ერთად დაიმახსოვრე.';
  else hint += 'დამახსოვრება გაამარტივე მაგალითით.';
  showToast(hint, 'info');
}

function renderMainLearned() {
  const data = app.all.filter(w => app.learned.has(w.id)).reverse();
  renderPaginated(data, 'mainLearnedList', 'mainLearnedPagination', 'main', w => `
    <div class="list-item glass">
      <div>
        <div><strong>${escapeHtml(w.german)}</strong> <small class="text-primary">${escapeHtml(getIPA(w.german))}</small></div>
        <div class="meta">${escapeHtml(w.translation)}</div>
      </div>
      <button class="icon-btn soft" onclick="toggleFavoriteById(${w.id})"><i class="${app.favorites.has(w.id) ? 'fas' : 'far'} fa-star"></i></button>
    </div>
  `);
}

function toggleFavoriteById(id) {
  if (app.favorites.has(id)) app.favorites.delete(id); else app.favorites.add(id);
  saveSet(STORAGE.favorites, app.favorites);
  updateStatusBlocks();
  renderFavorites(true);
  renderCard();
}

function initCategories() {
  const list = document.getElementById('categoryList');
  if (!list) return;
  list.innerHTML = `<li onclick="openCategoryList('all')"><i class="fas fa-globe"></i> ყველა</li>`;
  if (typeof categoryNames !== 'undefined') {
    Object.entries(categoryNames).forEach(([id, name]) => {
      list.innerHTML += `<li onclick="openCategoryList('${id}')"><i class="fas fa-folder"></i> ${name}</li>`;
    });
  }
}

function handleSearch() {
  app.searchQuery = document.getElementById('lexiconSearch').value.toLowerCase();
  app.pages.lexicon = 1;
  openCategoryList(app.currentCategory, null, true);
}

function clearSearch() {
  document.getElementById('lexiconSearch').value = '';
  handleSearch();
}

function renderWordRow(w) {
  const fav = app.favorites.has(w.id);
  const due = isDue(w.id);
  return `
    <div class="list-item glass">
      <div>
        <div><strong>${escapeHtml(w.german)}</strong> <small class="text-primary">${escapeHtml(getIPA(w.german))}</small></div>
        <div class="meta">${escapeHtml(w.translation)} ${due ? '• დღეს უნდა განმეორდეს' : ''}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="icon-btn soft" onclick="toggleFavoriteById(${w.id})"><i class="${fav ? 'fas' : 'far'} fa-star"></i></button>
        <button class="icon-btn soft" onclick="addToBankById(${w.id})"><i class="fas fa-bookmark"></i></button>
      </div>
    </div>
  `;
}

function addToBankById(id) {
  app.bank.add(id);
  saveSet(STORAGE.bank, app.bank);
  showToast('ბანკში დაემატა', 'info');
  renderWordBank(true);
}

function openCategoryList(catId, navBtn = null, isPaging = false) {
  if (!isPaging) { app.currentCategory = catId; app.pages.lexicon = 1; }
  document.getElementById('catListTitle').textContent = catId === 'all' ? 'ყველა სიტყვა' : categoryNames[catId] || catId;
  const source = (catId === 'all' ? [...app.all] : app.all.filter(w => w.category === catId)).filter(w => {
    if (!app.searchQuery) return true;
    return w.german.toLowerCase().includes(app.searchQuery) || w.translation.toLowerCase().includes(app.searchQuery);
  });
  renderPaginated(source, 'catWordsList', 'catWordsPagination', 'lexicon', w => `
    <div class="list-item glass">
      <div>
        <div><strong>${escapeHtml(w.german)}</strong> <small class="text-primary">${escapeHtml(getIPA(w.german))}</small></div>
        <div class="meta">${escapeHtml(w.translation)}${articleOf(w.german) ? ' • არტიკლი: ' + articleOf(w.german) : ''}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="icon-btn soft" onclick="openWordFromList(${w.id})"><i class="fas fa-play"></i></button>
        <button class="icon-btn soft" onclick="toggleFavoriteById(${w.id})"><i class="${app.favorites.has(w.id) ? 'fas' : 'far'} fa-star"></i></button>
      </div>
    </div>
  `);
  if (!isPaging) switchView('category-list', navBtn);
}

function openWordFromList(id) {
  const idx = app.all.findIndex(w => w.id === id);
  if (idx >= 0) {
    app.filtered = getDeckForCurrentMode();
    app.idx = app.filtered.findIndex(w => w.id === id);
    if (app.idx < 0) app.idx = 0;
    switchView('flashcards');
    renderCard();
  }
}

function renderWordBank(isPaging = false) {
  if (!isPaging) app.pages.bank = 1;
  const data = app.all.filter(w => app.bank.has(w.id));
  renderPaginated(data, 'bankWordsList', 'bankWordsPagination', 'bank', w => `
    <div class="list-item glass">
      <div>
        <div><strong>${escapeHtml(w.german)}</strong> <small class="text-primary">${escapeHtml(getIPA(w.german))}</small></div>
        <div class="meta">${escapeHtml(w.translation)}${app.review[w.id]?.lapses ? ' • შეცდომები: ' + app.review[w.id].lapses : ''}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="icon-btn soft" onclick="toggleFavoriteById(${w.id})"><i class="${app.favorites.has(w.id) ? 'fas' : 'far'} fa-star"></i></button>
        <button class="icon-btn soft" onclick="removeFromBank(${w.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `);
  if (!isPaging) switchView('wordbank');
}

function removeFromBank(id) {
  app.bank.delete(id);
  saveSet(STORAGE.bank, app.bank);
  renderWordBank(true);
  updateStatusBlocks();
}

function renderFavorites(isPaging = false) {
  if (!isPaging) app.pages.favorites = 1;
  const data = app.all.filter(w => app.favorites.has(w.id));
  renderPaginated(data, 'favoritesWordsList', 'favoritesWordsPagination', 'favorites', w => `
    <div class="list-item glass">
      <div>
        <div><strong>${escapeHtml(w.german)}</strong> <small class="text-primary">${escapeHtml(getIPA(w.german))}</small></div>
        <div class="meta">${escapeHtml(w.translation)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="icon-btn soft" onclick="openWordFromList(${w.id})"><i class="fas fa-play"></i></button>
        <button class="icon-btn soft" onclick="toggleFavoriteById(${w.id})"><i class="fas fa-star"></i></button>
      </div>
    </div>
  `);
}

function renderProfile() {
  const lCount = app.learned.size;
  const bCount = app.bank.size;
  const fCount = app.favorites.size;
  const streak = app.streak.count || 0;
  document.getElementById('profLearned').textContent = lCount;
  document.getElementById('profBank').textContent = bCount;
  document.getElementById('profFavorite').textContent = fCount;
  document.getElementById('profStreak').textContent = streak;
  const pct = app.all.length ? Math.round((lCount / app.all.length) * 100) : 0;
  document.getElementById('profileProgress').style.width = pct + '%';
  document.getElementById('profProgressText').textContent = pct + '%';
  let rank = 'დამწყები';
  if (pct > 25) rank = 'მოყვარული';
  if (pct > 60) rank = 'მცოდნე';
  if (pct > 90) rank = 'ექსპერტი';
  document.getElementById('profileRank').textContent = rank;

  const catStats = Object.entries(categoryNames).map(([id, label]) => {
    const total = app.all.filter(w => w.category === id).length;
    const learned = app.all.filter(w => w.category === id && app.learned.has(w.id)).length;
    const progress = total ? Math.round((learned / total) * 100) : 0;
    return `
      <div class="category-progress-item glass">
        <div class="category-progress-top">
          <div class="category-progress-name">${escapeHtml(label)}</div>
          <div class="text-dim">${learned}/${total} • ${progress}%</div>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
      </div>
    `;
  }).join('');
  document.getElementById('profileProgressByCategory').innerHTML = `<div class="category-progress">${catStats}</div>`;
}

function updateStatusBlocks() {
  document.getElementById('dailyReviewCount').textContent = getDueCount();
  document.getElementById('streakCount').textContent = app.streak.count || 0;
  document.getElementById('favoriteCount').textContent = app.favorites.size;
}

function openProfile(navBtn = null) {
  renderProfile();
  updateStatusBlocks();
  switchView('profile', navBtn);
}

function openDailyPlan(navBtn = null) {
  renderDailyPlan();
  switchView('plan', navBtn);
}

function renderDailyPlan() {
  const due = getDueCount();
  const newTarget = Math.max(5, Math.min(20, 10 + Math.floor((app.streak.count || 0) / 3)));
  const reviewTarget = Math.max(5, Math.min(25, due || 8));
  const learningMinutes = Math.max(10, Math.round((newTarget + reviewTarget) * 1.5));
  document.getElementById('dailyPlanBox').innerHTML = `
    <div class="lesson-grid">
      <div class="lesson-card glass">
        <h3>დღეს</h3>
        <p>ახალი სიტყვები: <strong>${newTarget}</strong><br>გამეორება: <strong>${reviewTarget}</strong><br>სავარაუდო დრო: <strong>${learningMinutes} წუთი</strong></p>
      </div>
      <div class="lesson-card glass">
        <h3>რეკომენდაცია</h3>
        <p>ჯერ გააკეთე <strong>დღეს შესასწავლი</strong> სიტყვები Flashcards-ში, შემდეგ გახსენი <strong>ნასწავლის ტესტი</strong> და ბოლოს <strong>არტიკლების ვიქტორინა</strong>.</p>
      </div>
      <div class="lesson-card glass">
        <h3>SRS მდგომარეობა</h3>
        <p>დღეს მოსალოდნელი გამეორება: <strong>${due}</strong> სიტყვა.<br>შეცდომები ავტომატურად გადადის ბანკში და განმეორებით ჩნდება უფრო ხშირად.</p>
      </div>
    </div>
  `;
}

function initGrammar() {
  const items = [
    { t: 'არტიკლები', p: 'გერმანულში სახელებს ხშირად აქვთ der / die / das. არტიკლი სიტყვასთან ერთად დაიმახსოვრე, რადგან სქესი ყოველთვის პირდაპირ არ ჩანს.' },
    { t: 'SRS / Leitner', p: 'სწორ პასუხზე სიტყვა უფრო იშვიათად გამოჩნდება, ხოლო შეცდომაზე — უფრო ხშირად. ასე ტვინი უფრო ხშირად ხედავს რთულ მასალას.' },
    { t: 'ზმნის ადგილი', p: 'მთავარ წინადადებაში ზმნა ხშირად მეორე ადგილზეა. ეს ერთ-ერთი ყველაზე მნიშვნელოვანი წესია წინადადებების აწყობისას.' },
    { t: 'Akkusativ / Dativ', p: 'ზოგი არტიკლი შემთხვევის მიხედვით იცვლება. ჯერ მნიშვნელობა ისწავლე და შემდეგ ფორმები დაამატე.' },
    { t: 'სწრაფი გამეორება', p: 'ფავორიტებში შეინახე რთული სიტყვები, ხოლო ბანკში შენახული სიტყვები ყოველი დღის ბოლოს გადახედე.' }
  ];
  document.getElementById('grammarLessons').innerHTML = items.map(i => `
    <div class="lesson-card glass">
      <h3>${escapeHtml(i.t)}</h3>
      <p>${escapeHtml(i.p)}</p>
    </div>
  `).join('');
}

function buildQuizQuestions(source, type, limit = 10) {
  const deck = [...source].sort(() => Math.random() - 0.5).slice(0, limit);
  return deck.map(w => {
    let answer = '';
    let prompt = '';
    let options = [];
    if (type === 'article') {
      const article = articleOf(w.german);
      if (!article) return null;
      prompt = w.german.replace(/^(der|die|das)\s+/i, '');
      answer = article;
      options = ['der', 'die', 'das'].sort(() => Math.random() - 0.5);
    } else if (type === 'sentence') {
      answer = w.example.replace(/[.,!?]/g, '').trim();
      prompt = w.exampleTrans;
      options = [];
    } else {
      prompt = w.german;
      answer = w.translation;
      options = [answer];
      const pool = app.all.map(x => x.translation).filter(Boolean);
      while (options.length < 4 && pool.length) {
        const r = pool[Math.floor(Math.random() * pool.length)];
        if (!options.includes(r)) options.push(r);
      }
      options.sort(() => Math.random() - 0.5);
    }
    return { id: w.id, word: w, prompt, answer, options, type };
  }).filter(Boolean);
}

function startCategoryTest() {
  const source = app.currentCategory === 'all' ? app.all : app.all.filter(w => w.category === app.currentCategory);
  if (source.length < 4) return alert('საჭიროა მინიმუმ 4 სიტყვა!');
  startQuiz(source, 'category', 'კატეგორიის ტესტი');
}

function startLearnedWordsTest() {
  const source = app.all.filter(w => app.learned.has(w.id));
  if (source.length < 4) return alert('ჯერ ისწავლეთ მინიმუმ 4 სიტყვა!');
  startQuiz(source, 'learned', 'ნასწავლის ტესტი');
}

function startArticleQuiz() {
  const source = app.all.filter(w => articleOf(w.german));
  if (source.length < 4) return alert('არტიკლების ტესტისთვის საჭიროა მინიმუმ 4 სიტყვა!');
  startQuiz(source, 'article', 'არტიკლების ვიქტორინა');
}

function startPlacementTest() {
  const pool = [...app.all].filter(w => w.translation && w.german);
  startQuiz(pool, 'placement', 'Placement Test', 12);
}

function startQuiz(source, type, title, limit = 10) {
  app.quiz.type = type;
  app.quiz.title = title;
  app.quiz.questions = buildQuizQuestions(source, type, limit).slice(0, limit);
  app.quiz.idx = 0;
  app.quiz.score = 0;
  app.quiz.answered = false;
  app.quiz.answeredIndex = -1;
  renderQuiz();
  switchView('quiz');
}

function quizCurrent() { return app.quiz.questions[app.quiz.idx]; }

function renderQuiz() {
  const q = quizCurrent();
  if (!q) return;
  document.getElementById('quizTitleBadge').textContent = app.quiz.title || 'ვიქტორინა';
  document.getElementById('quizCounter').textContent = `${app.quiz.idx + 1}/${app.quiz.questions.length}`;
  document.getElementById('quizScore').textContent = `ქულა: ${app.quiz.score}`;
  document.getElementById('quizModeHint').textContent = app.quiz.type === 'article' ? 'აირჩიე სწორი არტიკლი' : app.quiz.type === 'sentence' ? 'ააწყვე სწორად წინადადება' : 'აირჩიე სწორი პასუხი';
  document.getElementById('quizWord').innerHTML = app.quiz.type === 'article' ? `<span class="text-dim">${escapeHtml(q.prompt)}</span>` : escapeHtml(q.prompt);

  if (app.quiz.type === 'sentence') {
    renderSentenceQuestion(q.word);
    return;
  }

  document.getElementById('quizOptions').innerHTML = q.options.map((o, idx) => `
    <button class="quiz-option" onclick="selectQuizAnswer(${idx})">${escapeHtml(o)}</button>
  `).join('');
  document.getElementById('quizFeedback').innerHTML = '';
  document.getElementById('quizFeedback').className = 'answer-feedback';
}

function renderSentenceQuestion(wordObj) {
  const q = wordObj || quizCurrent().word;
  app.sentence.current = q;
  app.sentence.correct = q.example.replace(/[.,!?]/g, '').trim();
  app.sentence.pool = app.sentence.correct.split(' ').sort(() => Math.random() - 0.5);
  document.getElementById('sentenceGeoHint').textContent = q.exampleTrans;
  document.getElementById('sentenceDropzone').innerHTML = '';
  document.getElementById('sentenceWords').innerHTML = app.sentence.pool.map((w, i) => `
    <div class="word-chip" data-sentence-word="${escapeHtml(w)}" onclick="moveSentenceWord(this)">${escapeHtml(w)}</div>
  `).join('');
  document.getElementById('sentenceFeedback').innerHTML = '';
}

function selectQuizAnswer(idx) {
  const q = quizCurrent();
  if (!q) return;
  if (app.quiz.answered) return;
  app.quiz.answered = true;
  app.quiz.answeredIndex = idx;
  const selected = q.options[idx];
  const correct = q.answer;
  const isCorrect = selected === correct;
  if (q.type === 'article' || q.type === 'category' || q.type === 'learned' || q.type === 'placement') {
    touchWord(q.id, isCorrect);
    if (!isCorrect) registerWrongAnswer(q.id);
  }
  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    const value = q.options[i];
    btn.classList.remove('correct', 'wrong');
    if (value === correct) btn.classList.add('correct');
    if (i === idx && value !== correct) btn.classList.add('wrong');
  });
  document.getElementById('quizFeedback').innerHTML = maybeShowCorrectFeedback(selected, correct, app.quiz.type === 'article' ? `სიტყვა: ${escapeHtml(q.word.german)}` : '');
  document.getElementById('quizFeedback').className = `answer-feedback ${isCorrect ? 'feedback-good' : 'feedback-bad'}`;
  if (!isCorrect && q.word) {
    app.bank.add(q.word.id);
    saveSet(STORAGE.bank, app.bank);
  }
  if (isCorrect) app.quiz.score++;
  document.getElementById('quizScore').textContent = `ქულა: ${app.quiz.score}`;
  if (app.quiz.type === 'placement' && app.quiz.idx === app.quiz.questions.length - 1) {
    app.placement.result = app.quiz.score;
  }
  setTimeout(nextQuizQuestion, 1100);
}

function speakQuizQuestion() {
  const q = quizCurrent();
  if (!q) return;
  if (app.quiz.type === 'article') speakText(q.word.german);
  else if (app.quiz.type === 'sentence') speakText(q.word.example);
  else speakText(q.prompt);
}

function nextQuizQuestion() {
  app.quiz.idx += 1;
  app.quiz.answered = false;
  app.quiz.answeredIndex = -1;
  if (app.quiz.idx < app.quiz.questions.length) {
    renderQuiz();
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  const total = app.quiz.questions.length || 1;
  const score = app.quiz.score;
  const percent = Math.round((score / total) * 100);
  const perfect = score === total;
  if (perfect) {
    app.stats.perfects += 1;
    confettiBurst();
  }
  saveObj(STORAGE.stats, app.stats);
  updateAchievements();
  const level = percent >= 90 ? 'B2+' : percent >= 75 ? 'B1' : percent >= 50 ? 'A2' : 'A1';
  if (app.quiz.type === 'placement') {
    app.placement.level = level;
    if (!app.stats.placementBest || percent > app.stats.placementBest) app.stats.placementBest = percent;
    saveObj(STORAGE.stats, app.stats);
  }
  document.getElementById('quizWord').innerHTML = `შედეგი: ${score}/${total} (${percent}%)`;
  document.getElementById('quizOptions').innerHTML = `
    <div class="answer-feedback ${perfect ? 'feedback-good' : 'feedback-neutral'}">
      <strong>${app.quiz.title || 'ტესტი'} დასრულდა.</strong><br>
      ${app.quiz.type === 'placement' ? `შეფასებული დონე: <strong>${level}</strong><br>` : ''}
      ${perfect ? 'სრულყოფილი შედეგი! 🎉' : 'შეამოწმე ბანკი და კიდევ ერთხელ გაიმეორე რთული სიტყვები.'}
    </div>
    <button class="primary-btn mt-20" onclick="switchView('flashcards')">დასრულება</button>
  `;
  document.getElementById('quizFeedback').innerHTML = perfect ? 'შესანიშნავია — არანაირი შეცდომა არ იყო.' : 'შეცდომით გაცემული პასუხები უკვე გადავიდა სიტყვების ბანკში.';
  document.getElementById('quizFeedback').className = `answer-feedback ${perfect ? 'feedback-good' : 'feedback-neutral'}`;
}

function moveSentenceWord(el) {
  if (el.classList.contains('used')) return;
  const word = el.getAttribute('data-sentence-word');
  el.classList.add('used');
  const chip = document.createElement('div');
  chip.className = 'answer-chip';
  chip.textContent = word;
  chip.onclick = () => {
    chip.remove();
    el.classList.remove('used');
  };
  document.getElementById('sentenceDropzone').appendChild(chip);
}

function checkSentence() {
  const q = app.sentence.current;
  if (!q) return;
  const user = Array.from(document.getElementById('sentenceDropzone').children).map(c => c.textContent).join(' ').trim();
  const correct = app.sentence.correct;
  const isCorrect = user === correct;
  touchWord(q.id, isCorrect);
  if (!isCorrect) registerWrongAnswer(q.id);
  document.getElementById('sentenceFeedback').innerHTML = maybeShowCorrectFeedback(user || '—', correct, `სწორი წინადადება: ${escapeHtml(q.example)}`);
  document.getElementById('sentenceFeedback').className = `answer-feedback ${isCorrect ? 'feedback-good' : 'feedback-bad'}`;
  if (isCorrect) {
    showToast('ყოჩაღ!');
    setTimeout(nextSentence, 1200);
  } else {
    app.bank.add(q.id);
    saveSet(STORAGE.bank, app.bank);
  }
}

function nextSentence() {
  startSentenceBuilder();
}

function startSentenceBuilder() {
  const source = app.all.filter(w => app.learned.has(w.id) && w.example);
  if (!source.length) return alert('ჯერ ისწავლეთ სიტყვები!');
  const rw = source[Math.floor(Math.random() * source.length)];
  app.quiz.type = 'sentence';
  app.quiz.title = 'წინადადებების აწყობა';
  app.quiz.questions = [{ id: rw.id, word: rw, prompt: rw.exampleTrans, answer: rw.example.replace(/[.,!?]/g, '').trim(), options: [], type: 'sentence' }];
  app.quiz.idx = 0;
  app.quiz.score = 0;
  app.quiz.answered = false;
  renderQuiz();
  switchView('sentence');
}

function startFlashcardStudy() {
  app.filtered = getDeckForCurrentMode();
  app.idx = 0;
  renderCard();
  switchView('flashcards');
}

function openFavorites(navBtn = null, isPaging = false) {
  if (!isPaging) app.pages.favorites = 1;
  renderFavorites(isPaging);
  switchView('favorites', navBtn);
}

function toggleTheme() {
  app.theme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
  applyTheme();
  syncStorage();
}

async function resetApp() {
  if (!confirm('ნამდვილად გსურთ ყველა მონაცემის წაშლა? ეს სრულად გაასუფთავებს სწავლას, ბანკს, ფავორიტებს, პროგრესს და ქეშსაც.')) return;
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (window.caches && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {}
  location.reload();
}

function openWordBank(isPaging = false) { renderWordBank(isPaging); switchView('wordbank'); }

function speakWordById(id) { const w = app.all.find(x => x.id === id); if (w) speakText(w.german); }

function showHintForWordById(id) { const w = app.all.find(x => x.id === id); if (w) { app.idx = app.all.findIndex(x => x.id === id); renderCard(); showHintForCurrent(); } }

function updateLearnedAndBankForWrong(id) { app.bank.add(id); saveSet(STORAGE.bank, app.bank); }

function renderWordBankFromMenu() { openWordBank(); }

function refreshAll() { refreshAllViews(); updateStatusBlocks(); renderCard(); }

function showCurrentProgress() { renderProfile(); openProfile(); }

function startLearnedWordsTestFromMenu() { startLearnedWordsTest(); }

function startPlacementTestFromMenu() { startPlacementTest(); }

function startArticleQuizFromMenu() { startArticleQuiz(); }

function openDailyPlanFromMenu() { openDailyPlan(); }

function startCategoryTestFromMenu() { startCategoryTest(); }

function startSentenceBuilderFromMenu() { startSentenceBuilder(); }

function startFlashcardsFromMenu() { startFlashcardStudy(); }

function openBankFromMenu() { openWordBank(); }

function openGrammarFromMenu() { switchView('grammar'); }

function updateAllAfterStorageChange() { refreshAll(); updateAchievements(); }

window.addEventListener('online', () => showToast('ონლაინ რეჟიმი დაბრუნდა', 'success'));
window.addEventListener('offline', () => showToast('ოფლაინ რეჟიმშია — მონაცემები ლოკალურად ინახება', 'info'));
