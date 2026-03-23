document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;
    tg.expand(); 

    // მომხმარებლის იდენტიფიკაცია
    let username = localStorage.getItem("app_nickname");
    const modal = document.getElementById("nickname-modal");
    const greeting = document.getElementById("user-greeting");
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) {
        username = tg.initDataUnsafe.user.first_name;
        localStorage.setItem("app_nickname", username);
    }

    if (!username) {
        modal.classList.add("active");
        modal.style.display = "flex";
    } else {
        if (greeting) greeting.innerText = `გამარჯობა, ${username}!`;
        modal.style.display = "none"; 
    }

    document.getElementById("save-nickname-btn").addEventListener("click", () => {
        const inputVal = document.getElementById("nickname-input").value;
        if (inputVal.trim() !== "") {
            localStorage.setItem("app_nickname", inputVal);
            if (greeting) greeting.innerText = `გამარჯობა, ${inputVal}!`;
            modal.style.display = "none";
            modal.classList.remove("active");
        }
    });

    // მენიუს (Sidebar) მართვა
    const sidebar = document.getElementById("sidebar");
    document.getElementById("menu-btn").addEventListener("click", () => sidebar.classList.add("active"));
    document.getElementById("close-sidebar").addEventListener("click", () => sidebar.classList.remove("active"));

    // ძირითადი ცვლადები
    let allWords = [];
    let dailyWords = [];
    let currentIndex = 0;
    let learnedWords = JSON.parse(localStorage.getItem("learned_words") || "[]");
    
    // ლექსიკონის ცვლადები
    let dictPage = 0;
    const wordsPerPage = 20;
    let filteredDictWords = [];

    // მონაცემების ჩატვირთვა
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allWords = data;
            updateStats();
        })
        .catch(err => console.error("Error loading JSON:", err));

    // სექციების დამალვის ფუნქცია
    function hideAllSections() {
        document.getElementById("learning-section").classList.add("hidden");
        document.getElementById("dict-area").classList.add("hidden");
        if (document.getElementById("profile-section")) document.getElementById("profile-section").classList.add("hidden");
        sidebar.classList.remove("active");
    }

    // სწავლის დაწყება
    document.getElementById("start-learning-btn").addEventListener("click", () => {
        startDailySession();
        document.getElementById("start-learning-btn").classList.add("hidden");
        document.getElementById("next-word-btn").classList.remove("hidden");
    });

    function startDailySession() {
        const unlearned = allWords.filter(w => !learnedWords.includes(w.id));
        dailyWords = unlearned.sort(() => 0.5 - Math.random()).slice(0, 20);
        currentIndex = 0;
        showWord();
    }

    function showWord() {
        if (currentIndex >= dailyWords.length) {
            alert("დღევანდელი სიტყვები დასრულდა! 🎉");
            return;
        }
        const word = dailyWords[currentIndex];
        document.getElementById("word-de").innerText = word.de;
        document.getElementById("word-phonetics").innerText = word.phonetics || "";
        document.getElementById("word-ka").innerText = word.ka;

        // ავტომატურად ვამატებთ ნასწავლებში
        if (!learnedWords.includes(word.id)) {
            learnedWords.push(word.id);
            localStorage.setItem("learned_words", JSON.stringify(learnedWords));
            updateStats();
        }
    }

    document.getElementById("next-word-btn").addEventListener("click", () => {
        currentIndex++;
        showWord();
    });

    // ლექსიკონის ლოგიკა (პაგინაცია და ძებნა)
    document.getElementById("menu-dict").addEventListener("click", () => {
        hideAllSections();
        document.getElementById("dict-area").classList.remove("hidden");
        
        const allLearned = learnedWords.map(id => allWords.find(w => w.id === id)).filter(w => w);
        filteredDictWords = allLearned;
        dictPage = 0;
        renderDict();
    });

    document.getElementById("back-from-dict-btn").addEventListener("click", () => {
        hideAllSections();
        document.getElementById("learning-section").classList.remove("hidden");
    });

    // ძებნის ფუნქცია ლექსიკონში
    const searchInput = document.getElementById("dict-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            const allLearned = learnedWords.map(id => allWords.find(w => w.id === id)).filter(w => w);
            
            filteredDictWords = allLearned.filter(w => 
                w.de.toLowerCase().includes(query) || 
                w.ka.toLowerCase().includes(query)
            );
            dictPage = 0;
            renderDict();
        });
    }

    function renderDict() {
        const list = document.getElementById("dict-list");
        list.innerHTML = "";

        const start = dictPage * wordsPerPage;
        const end = start + wordsPerPage;
        const pageItems = filteredDictWords.slice(start, end);

        if (pageItems.length === 0) {
            list.innerHTML = "<p style='text-align:center; padding:20px;'>სიტყვები ვერ მოიძებნა</p>";
            return;
        }

        pageItems.forEach(word => {
            const div = document.createElement("div");
            div.className = "words-list-item";
            div.innerHTML = `<span class="de">${word.de}</span><span class="ka">${word.ka}</span>`;
            list.appendChild(div);
        });

        // ნავიგაციის ღილაკები
        const nav = document.createElement("div");
        nav.style = "display:flex; justify-content:space-between; margin-top:20px; gap:10px;";

        if (dictPage > 0) {
            const pBtn = document.createElement("button");
            pBtn.className = "btn-secondary"; pBtn.style.flex = "1"; pBtn.innerText = "⬅️ წინა";
            pBtn.onclick = () => { dictPage--; renderDict(); };
            nav.appendChild(pBtn);
        }

        if (end < filteredDictWords.length) {
            const nBtn = document.createElement("button");
            nBtn.className = "btn-secondary"; nBtn.style.flex = "1"; nBtn.innerText = "შემდეგი ➡️";
            nBtn.onclick = () => { dictPage++; renderDict(); };
            nav.appendChild(nBtn);
        }
        list.appendChild(nav);
    }

    // სტატისტიკის განახლება
    function updateStats() {
        const learnedCount = learnedWords.length;
        const totalCount = allWords.length;
        const progress = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;

        if (document.getElementById("stat-learned")) document.getElementById("stat-learned").innerText = learnedCount;
        if (document.getElementById("stat-total")) document.getElementById("stat-total").innerText = totalCount;
        if (document.getElementById("stat-progress-bar")) document.getElementById("stat-progress-bar").style.width = progress + "%";
    }

    // პროგრესის განულება
    document.getElementById("menu-reset").addEventListener("click", () => {
        if (confirm("ნამდვილად გსურთ პროგრესის სრული განულება?")) {
            localStorage.removeItem("learned_words");
            learnedWords = [];
            location.reload();
        }
    });
});
                
