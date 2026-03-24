let allWords = [];
let learnedHistory = JSON.parse(localStorage.getItem("p_hist") || "[]");
let mistakes = JSON.parse(localStorage.getItem("p_mistakes") || "[]");
let xp = parseInt(localStorage.getItem("p_xp") || "0");
let streak = parseInt(localStorage.getItem("p_streak") || "0");

let dailyStats = JSON.parse(localStorage.getItem("p_daily") || "{}");
let categoryStats = JSON.parse(localStorage.getItem("p_cats") || "{}");
let achievements = JSON.parse(localStorage.getItem("p_achievs") || '{"early":false,"polyglot":false,"unstoppable":false}');

let learnedPage = 1, dictPage = 1;
let current = null, selectedMistakeId = null;
let currentSentenceObj = null;
let currentPracticeWord = null;

let barChartInstance = null;
let pieChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch('data.json');
        allWords = await res.json();
        const theme = localStorage.getItem("p_theme");
        if(theme) changeTheme(theme);
        
        checkStreak();
        updateUI();
        renderWord();
        renderLearnedList();

        document.getElementById("search").addEventListener("input", (e) => {
            dictPage = 1; updateDict(e.target.value);
        });
    } catch(e) { console.error("Error loading JSON data"); }
});

function toggleSidebar() { document.getElementById("sidebar").classList.toggle("active"); }

function updateUI() {
    document.getElementById("xp-val").innerText = xp;
    document.getElementById("streak-val").innerText = streak;
    
    const badge = document.getElementById("mistake-badge");
    badge.innerText = mistakes.length;
    badge.style.display = mistakes.length > 0 ? "inline-block" : "none";

    const name = localStorage.getItem("app_nickname") || "გიორგი";
    document.getElementById("sidebar-user-name").innerText = name;
    document.getElementById("avatar").innerText = name.charAt(0).toUpperCase();
}

// ================= სწავლა =================
function renderWord() {
    document.getElementById("main-card").classList.remove("is-flipped");
    const pool = allWords.filter(w => !learnedHistory.some(h => h.id === w.id));
    const target = pool.length > 0 ? pool : allWords;
    current = target[Math.floor(Math.random() * target.length)];
    
    setTimeout(() => {
        document.getElementById("de-word").innerText = current.de;
        document.getElementById("de-ph").innerText = current.phonetics;
        document.getElementById("ka-word").innerText = current.ka;
        document.getElementById("ex-de").innerText = current.example_de;
        document.getElementById("ex-ph").innerText = current.example_phonetics || "";
        document.getElementById("ex-ka").innerText = current.example_ka;
    }, 150);
}

function handleWin() {
    xp += 10;
    if(!learnedHistory.find(x => x.id === current.id)) {
        learnedHistory.unshift(current);
        const todayStr = new Date().toLocaleDateString('ka-GE').substring(0, 5);
        dailyStats[todayStr] = (dailyStats[todayStr] || 0) + 1;
        const cat = current.category || "სხვა";
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
        checkAchievements(); 
    }
    mistakes = mistakes.filter(m => m.id !== current.id);
    learnedPage = 1;
    saveData();
    updateUI();
    renderLearnedList();
    renderWord();
}

function handleMistake() {
    if(!mistakes.find(x => x.id === current.id)) mistakes.push(current);
    saveData();
    updateUI();
    renderWord();
}

function checkAchievements() {
    const hours = new Date().getHours();
    const todayStr = new Date().toLocaleDateString('ka-GE').substring(0, 5);
    if(!achievements.early && hours < 8 && dailyStats[todayStr] >= 10) achievements.early = true;
    if(!achievements.polyglot && learnedHistory.length >= 100) achievements.polyglot = true;
    if(!achievements.unstoppable && streak >= 7) achievements.unstoppable = true;
}

function saveData() {
    localStorage.setItem("p_xp", xp);
    localStorage.setItem("p_hist", JSON.stringify(learnedHistory));
    localStorage.setItem("p_mistakes", JSON.stringify(mistakes));
    localStorage.setItem("p_daily", JSON.stringify(dailyStats));
    localStorage.setItem("p_cats", JSON.stringify(categoryStats));
    localStorage.setItem("p_achievs", JSON.stringify(achievements));
}

// ================= პაგინაცია სწავლაში და ლექსიკონში =================
function renderLearnedList() {
    const cont = document.getElementById("learned-list");
    const pag = document.getElementById("learned-pagination");
    const perPage = 15;
    const total = Math.ceil(learnedHistory.length / perPage);
    if (learnedHistory.length === 0) { cont.innerHTML = "<p style='color:var(--text-dim); font-size:12px;'>ჯერ არცერთი სიტყვა არ გაგივლიათ.</p>"; pag.innerHTML = ""; return; }
    const start = (learnedPage - 1) * perPage;
    cont.innerHTML = learnedHistory.slice(start, start + perPage).map(w => `<div class="dict-item"><div class="dict-left"><span class="dict-de">${w.de}</span><span class="dict-ph">${w.phonetics}</span></div><span class="dict-ka">${w.ka}</span></div>`).join('');
    pag.innerHTML = total > 1 ? `<button class="page-btn" onclick="lPageChange(-1)" ${learnedPage === 1 ? 'disabled' : ''}>← უკან</button><span>${learnedPage} / ${total}</span><button class="page-btn" onclick="lPageChange(1)" ${learnedPage >= total ? 'disabled' : ''}>წინ →</button>` : "";
}
window.lPageChange = (v) => { learnedPage += v; renderLearnedList(); };

function updateDict(q = "") {
    const resDiv = document.getElementById("dict-results");
    const pag = document.getElementById("dict-pagination");
    const perPage = 40;
    const filtered = allWords.filter(w => w.de.toLowerCase().includes(q.toLowerCase()) || w.ka.toLowerCase().includes(q.toLowerCase()));
    const total = Math.ceil(filtered.length / perPage);
    const start = (dictPage - 1) * perPage;
    resDiv.innerHTML = filtered.slice(start, start + perPage).map(w => `<div class="dict-item"><div class="dict-left"><span class="dict-de">${w.de}</span><span class="dict-ph">${w.phonetics}</span></div><span class="dict-ka">${w.ka}</span></div>`).join('');
    pag.innerHTML = total > 1 ? `<button class="page-btn" onclick="dPageChange(-1, '${q}')" ${dictPage === 1 ? 'disabled' : ''}>← უკან</button><span>${dictPage} / ${total}</span><button class="page-btn" onclick="dPageChange(1, '${q}')" ${dictPage >= total ? 'disabled' : ''}>წინ →</button>` : "";
}
window.dPageChange = (v, q) => { dictPage += v; updateDict(q); };

// ================= შეცდომების ბანკი (მოდალი) =================
function renderMistakesBank() {
    const list = document.getElementById("mistakes-list");
    if(mistakes.length === 0) { list.innerHTML = "<p style='text-align:center; color:var(--text-dim); margin-top:20px;'>ბანკი ცარიელია. ყოჩაღ!</p>"; return; }
    list.innerHTML = mistakes.map(m => `<div class="dict-item clickable-item" onclick="openModal(${m.id})"><div class="dict-left"><span class="dict-de">${m.de}</span><span class="dict-ph">${m.phonetics}</span></div><span class="dict-ka">${m.ka}</span></div>`).join('');
}
window.openModal = (id) => {
    const word = mistakes.find(m => m.id === id);
    if(word) {
        selectedMistakeId = id; document.getElementById("modal-word-de").innerText = word.de; document.getElementById("modal-word-ph").innerText = word.phonetics;
        document.getElementById("mistake-modal").classList.remove("hidden");
    }
};
window.closeModal = () => { document.getElementById("mistake-modal").classList.add("hidden"); selectedMistakeId = null; };
window.removeMistake = () => {
    if(selectedMistakeId !== null) {
        mistakes = mistakes.filter(m => m.id !== selectedMistakeId); saveData(); updateUI(); renderMistakesBank(); closeModal();
    }
};

// ================= ᲐᲮᲐᲚᲘ: სიტყვებში ვარჯიში =================
function startWordPractice() {
    if (learnedHistory.length < 4) {
        document.getElementById("wp-msg").classList.remove("hidden");
        document.getElementById("wp-content").classList.add("hidden");
        return;
    }
    document.getElementById("wp-msg").classList.add("hidden");
    document.getElementById("wp-content").classList.remove("hidden");
    
    currentPracticeWord = learnedHistory[Math.floor(Math.random() * learnedHistory.length)];
    let options = [currentPracticeWord];
    
    // ვამატებთ 3 შემთხვევით სიტყვას შეცდომაში შესაყვანად
    while(options.length < 4) {
        let rand = allWords[Math.floor(Math.random() * allWords.length)];
        if(!options.some(o => o.id === rand.id)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5); // ვურევთ ვარიანტებს
    
    document.getElementById("wp-word-de").innerText = currentPracticeWord.de;
    document.getElementById("wp-word-ph").innerText = currentPracticeWord.phonetics;
    
    const optionsDiv = document.getElementById("wp-options");
    optionsDiv.innerHTML = options.map(opt => `
        <button class="quiz-btn" onclick="checkWordAnswer(this, ${opt.id})">${opt.ka}</button>
    `).join('');
}

window.checkWordAnswer = (btn, selectedId) => {
    document.querySelectorAll(".quiz-btn").forEach(b => b.disabled = true);
    
    if (selectedId === currentPracticeWord.id) {
        btn.classList.add("correct");
        xp += 5; // სწორი პასუხის ბონუსი
        saveData();
        updateUI();
    } else {
        btn.classList.add("wrong");
        // სწორის გაფერადება
        document.querySelectorAll(".quiz-btn").forEach(b => {
            if (b.innerText === currentPracticeWord.ka) b.classList.add("correct");
        });
        // ვამატებთ შეცდომების ბანკში
        if (!mistakes.some(m => m.id === currentPracticeWord.id)) {
            mistakes.push(currentPracticeWord);
            saveData();
            updateUI();
        }
    }
    setTimeout(startWordPractice, 1500);
};

// ================= წინადადებების კონსტრუქტორი =================
function startSentenceBuilder() {
    const validWords = learnedHistory.filter(w => w.example_de && w.example_de.split(" ").length > 2);
    if(validWords.length === 0) { document.getElementById("sentence-ka").innerText = "სავარჯიშოს დასაწყებად ისწავლეთ მეტი სიტყვა."; return; }
    
    currentSentenceObj = validWords[Math.floor(Math.random() * validWords.length)];
    document.getElementById("sentence-ka").innerText = `თარგმნე: "${currentSentenceObj.example_ka}"`;
    
    let words = currentSentenceObj.example_de.replace(/[.,!?]/g, "").split(" ");
    words = words.sort(() => Math.random() - 0.5);
    
    document.getElementById("drop-zone").innerHTML = "";
    document.getElementById("word-pool").innerHTML = words.map((w) => `<div class="word-pill" onclick="moveWord(this)">${w}</div>`).join('');
}

window.moveWord = (el) => {
    const zone = document.getElementById("drop-zone");
    const pool = document.getElementById("word-pool");
    if(el.parentElement.id === "word-pool") zone.appendChild(el); else pool.appendChild(el);
};

window.checkSentence = () => {
    if(!currentSentenceObj) return;
    const userSentence = Array.from(document.getElementById("drop-zone").children).map(el => el.innerText).join(" ").toLowerCase();
    const correctSentence = currentSentenceObj.example_de.replace(/[.,!?]/g, "").toLowerCase();
    
    if(userSentence === correctSentence) {
        alert("🎉 ყოჩაღ! წინადადება სწორია (+15 XP)"); xp += 15; saveData(); updateUI(); startSentenceBuilder();
    } else { alert("❌ შეცდომაა. სცადე თავიდან."); }
};

// ================= პროფილის რენდერი (გრაფიკები და მედლები) =================
function renderProfile() {
    const name = localStorage.getItem("app_nickname") || "გიორგი";
    document.getElementById("prof-name").innerText = name;
    document.getElementById("prof-xp-val").innerText = xp;
    
    if(achievements.early) document.getElementById("achiev-early").classList.add("unlocked");
    if(achievements.polyglot) document.getElementById("achiev-polyglot").classList.add("unlocked");
    if(achievements.unstoppable) document.getElementById("achiev-unstoppable").classList.add("unlocked");

    const barCtx = document.getElementById('activityChart').getContext('2d');
    const pieCtx = document.getElementById('categoryChart').getContext('2d');
    
    const labels = [], data = [];
    for(let i=6; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate() - i);
        let dateStr = d.toLocaleDateString('ka-GE').substring(0, 5);
        labels.push(dateStr); data.push(dailyStats[dateStr] || 0);
    }
    if(barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(barCtx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'სიტყვები', data: data, backgroundColor: '#00d2ff', borderRadius: 5 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } } });

    const catLabels = Object.keys(categoryStats);
    const catData = Object.values(categoryStats);
    if(pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(pieCtx, { type: 'doughnut', data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: ['#ff4757', '#00d2ff', '#ffd700', '#2ed573', '#a29bfe'], borderWidth: 0 }] }, options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 10 } } } } });
}

// ================= ნავიგაცია =================
window.showSection = (id) => {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + "-section").classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navBtn = document.getElementById('nav-' + id);
    if(navBtn) navBtn.classList.add('active');

    if(id === 'dict') updateDict();
    if(id === 'mistakes') renderMistakesBank();
    if(id === 'profile') renderProfile();
    if(id === 'sentence') startSentenceBuilder();
    if(id === 'word-practice') startWordPractice();
    
    toggleSidebar();
};

window.changeTheme = (t) => { document.body.className = t === 'dark' ? '' : t + '-mode'; localStorage.setItem("p_theme", t); };
window.resetProgress = () => { if(confirm("ნამდვილად გსურთ პროგრესის განულება?")) { localStorage.clear(); location.reload(); } };
window.speakWord = (txt) => { const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 0.8; speechSynthesis.speak(u); };

function checkStreak() {
    const today = new Date().toDateString();
    const last = localStorage.getItem("p_date");
    if (last !== today) {
        if (last === new Date(Date.now() - 86400000).toDateString()) streak++;
        else if (!last) streak = 1; else streak = 0;
        localStorage.setItem("p_date", today); localStorage.setItem("p_streak", streak);
    }
        }
                            
