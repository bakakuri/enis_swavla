const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg && tg.expand) { tg.expand(); }

const safeAlert = (msg) => {
    if (tg && tg.showAlert) { tg.showAlert(msg); } else { alert(msg); }
};

const safeHaptic = (type) => {
    if (tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred(type);
    }
};

let catNames = {};
let wordsDB = {};

let defaultUser = {
    xp: 0, lives: 5, streak: 0, lastPlayed: null, activeCat: 'basics',
    progress: { basics: 0, city: 0, verbs: 0, food: 0, other: 0 }
};

let user = { ...defaultUser };
const WORDS_PER_DAY = 20;
const REVIEW_COUNT = 3; // რამდენი ძველი სიტყვა გავიმეოროთ ყოველდღიურად
let lessonData = [];
let wordIndex = 0;
let quizIndex = 0;
let currentQuizData = [];
let newWordsLearnedThisSession = 0; // იმახსოვრებს, რამდენი ახალი სიტყვა იყო ამ სესიაში

// მონაცემების ჩატვირთვა JSON-დან
async function loadDataAndInit() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        catNames = data.catNames;
        wordsDB = data.wordsDB;
        initApp();
    } catch (error) {
        console.error("ვერ მოხერხდა JSON-ის წაკითხვა:", error);
        safeAlert("მონაცემების ჩატვირთვა ვერ მოხერხდა. გაუშვით ლოკალურ სერვერზე.");
    }
}

function initApp() {
    const saved = localStorage.getItem('german_app_v12');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            user = { ...defaultUser, ...parsed };
            if (!user.progress) user.progress = defaultUser.progress;
        } catch (e) {
            user = { ...defaultUser };
        }
    }

    let today = new Date().toDateString();
    if (user.lastPlayed !== today) {
        if (user.lastPlayed) {
            let y = new Date(); y.setDate(y.getDate() - 1);
            if (new Date(user.lastPlayed).toDateString() !== y.toDateString()) user.streak = 0;
        }
        user.lives = 5;
    }
    renderSidebar();
    updateUI();
}

function saveData() { localStorage.setItem('german_app_v12', JSON.stringify(user)); updateUI(); }

function resetProgress() {
    localStorage.removeItem('german_app_v12');
    location.reload();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
}

function renderSidebar() {
    const list = document.getElementById('catList');
    list.innerHTML = '';
    for (let key in catNames) {
        let btn = document.createElement('div');
        btn.className = `cat-btn ${user.activeCat === key ? 'active' : ''}`;
        btn.innerText = catNames[key];
        btn.addEventListener('click', () => {
            user.activeCat = key;
            saveData();
            renderSidebar();
            toggleSidebar();
        });
        list.appendChild(btn);
    }
}

function updateUI() {
    if (!user.activeCat || !wordsDB[user.activeCat]) {
        user.activeCat = 'basics';
    }

    document.getElementById('lives').innerText = user.lives;
    document.getElementById('streak').innerText = user.streak;
    document.getElementById('totalXp').innerText = user.xp;
    document.getElementById('level').innerText = Math.floor(user.xp / 100) + 1;

    document.getElementById('activeCatName').innerText = catNames[user.activeCat];

    let currentProg = user.progress[user.activeCat] || 0;
    let totalInCat = wordsDB[user.activeCat].length;
    document.getElementById('catProgressText').innerText = `${currentProg} / ${totalInCat}`;
    
    let progressPercent = totalInCat > 0 ? (currentProg / totalInCat) * 100 : 0;
    document.getElementById('catProgressBar').style.width = `${progressPercent}%`;
}

// --- ნაბიჯი 1: სწავლა (ინტერვალური გამეორების ლოგიკით) ---
function startLearning() {
    if (user.lives <= 0) return safeAlert('სიცოცხლეები ამოგეწურა! დაელოდე ხვალამდე.');

    let catWords = wordsDB[user.activeCat] || [];
    let startIdx = user.progress[user.activeCat] || 0;

    if (startIdx >= catWords.length && catWords.length > 0) {
        return safeAlert('ეს კატეგორია უკვე სრულად ისწავლე! მენიუდან (☰) აირჩიე სხვა.');
    }

    let learnedWords = catWords.slice(0, startIdx); // უკვე ნასწავლი სიტყვები
    let unlearnedWords = catWords.slice(startIdx); // ახალი სიტყვები

    // რამდენი ძველი სიტყვა შეგვიძლია გამოვიყენოთ (თუ 3-ზე ნაკლები გვაქვს ნასწავლი, ვიღებთ იმდენს, რამდენიც გვაქვს)
    let actualReviewCount = Math.min(REVIEW_COUNT, learnedWords.length);
    
    // ახალი სიტყვების რაოდენობა = 20 მინუს ძველი სიტყვების რაოდენობა
    let newWordsCount = Math.min(WORDS_PER_DAY - actualReviewCount, unlearnedWords.length);

    // ვირჩევთ შემთხვევით ძველ სიტყვებს გასამეორებლად
    let reviewWords = [...learnedWords].sort(() => 0.5 - Math.random()).slice(0, actualReviewCount);
    
    // ვიღებთ ახალ სიტყვებს
    let newWords = unlearnedWords.slice(0, newWordsCount);

    // ვაერთიანებთ და ვურევთ ერთმანეთში, რომ არ ვიცოდეთ რომელია ძველი და ახალი
    lessonData = [...reviewWords, ...newWords].sort(() => 0.5 - Math.random());
    
    newWordsLearnedThisSession = newWordsCount; // ვიმახსოვრებთ მხოლოდ ახლების რაოდენობას პროგრესისთვის
    wordIndex = 0;

    if (lessonData.length === 0) return safeAlert('ამ კატეგორიაში სიტყვები არაა დამატებული.');

    showScreen('learningScreen');
    loadWord();
}

function loadWord() {
    if (!lessonData || lessonData.length === 0) return;
    const word = lessonData[wordIndex];
    document.getElementById('fcDe').innerText = word.de;
    document.getElementById('fcPh').innerText = word.ph;
    document.getElementById('fcKa').innerText = word.ka;

    document.getElementById('fcDetails').classList.remove('show');
    document.getElementById('tapHint').style.display = 'block';
    document.getElementById('nextWordBtn').style.display = 'none';
    document.getElementById('startPracticeBtn').style.display = 'none';

    document.getElementById('learnProgressText').innerText = `${wordIndex + 1} / ${lessonData.length}`;
}

function revealTranslation() {
    if (document.getElementById('fcDetails').classList.contains('show')) return;
    document.getElementById('fcDetails').classList.add('show');
    document.getElementById('tapHint').style.display = 'none';

    if (wordIndex < lessonData.length - 1) {
        document.getElementById('nextWordBtn').style.display = 'block';
    } else {
        document.getElementById('startPracticeBtn').style.display = 'block';
    }
}

function nextWord() { wordIndex++; loadWord(); }

// --- ნაბიჯი 2: პრაქტიკა ---
function startPractice() {
    quizIndex = 0;
    let fullCat = wordsDB[user.activeCat] || [];

    currentQuizData = lessonData.map(item => {
        const isReverse = Math.random() > 0.5;
        let qText = isReverse ? item.ka : item.de;
        let correctAns = isReverse ? item.de : item.ka;
        let options = [correctAns];

        while (options.length < 3) {
            let randomItem = fullCat[Math.floor(Math.random() * fullCat.length)];
            let wrongOpt = isReverse ? randomItem.de : randomItem.ka;
            if (!options.includes(wrongOpt)) options.push(wrongOpt);
        }

        return {
            q: qText, correct: correctAns,
            options: options.sort(() => Math.random() - 0.5),
            type: isReverse ? "ka-de" : "de-ka"
        };
    }).sort(() => Math.random() - 0.5);

    document.getElementById('practiceLives').innerText = user.lives;
    showScreen('practiceScreen');
    loadQuiz();
}

function loadQuiz() {
    if (!currentQuizData || currentQuizData.length === 0) return;
    let q = currentQuizData[quizIndex];
    document.getElementById('quizInstruction').innerText = q.type === 'de-ka' ? 'რას ნიშნავს?' : 'როგორ არის გერმანულად?';
    document.getElementById('quizQuestion').innerText = q.q;
    document.getElementById('nextQuizBtn').style.display = 'none';

    const grid = document.getElementById('quizOptions');
    grid.innerHTML = '';

    q.options.forEach(opt => {
        let btn = document.createElement('div');
        btn.className = 'option';
        btn.innerText = opt;
        btn.addEventListener('click', () => checkAnswer(btn, opt, q.correct));
        grid.appendChild(btn);
    });
}

function checkAnswer(btn, selected, correct) {
    document.querySelectorAll('.option').forEach(b => b.style.pointerEvents = 'none');

    if (selected === correct) {
        btn.classList.add('correct');
        user.xp += 10;
        safeHaptic('success');
    } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.option').forEach(b => {
            if (b.innerText === correct) b.classList.add('correct');
        });
        user.lives--;
        document.getElementById('practiceLives').innerText = user.lives;
        safeHaptic('error');
    }

    saveData();
    document.getElementById('nextQuizBtn').style.display = 'block';

    if (user.lives <= 0) setTimeout(() => { safeAlert('სამწუხაროდ სიცოცხლეები ამოიწურა. სცადე ხვალ!'); showScreen('dashboard'); }, 1500);
}

function nextQuiz() {
    quizIndex++;
    if (quizIndex < currentQuizData.length) {
        loadQuiz();
    } else {
        // ვუმატებთ მხოლოდ ახალი სიტყვების რაოდენობას პროგრესს
        user.progress[user.activeCat] += newWordsLearnedThisSession;

        let today = new Date().toDateString();
        if (user.lastPlayed !== today) {
            user.streak++;
            user.lastPlayed = today;
        }

        saveData();
        safeAlert('გილოცავ! დღევანდელი სესია წარმატებით დაასრულე 🎉');
        showScreen('dashboard');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menuBtn').addEventListener('click', toggleSidebar);
    document.getElementById('overlay').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarResetBtn').addEventListener('click', resetProgress);

    document.getElementById('startLessonBtn').addEventListener('click', startLearning);
    document.getElementById('closeLearnBtn').addEventListener('click', () => showScreen('dashboard'));

    document.getElementById('flashcard').addEventListener('click', revealTranslation);
    document.getElementById('nextWordBtn').addEventListener('click', nextWord);
    document.getElementById('startPracticeBtn').addEventListener('click', startPractice);

    document.getElementById('nextQuizBtn').addEventListener('click', nextQuiz);

    loadDataAndInit();
});
