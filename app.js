document.addEventListener("DOMContentLoaded", () => {
    // 1. ნიკნეიმის მართვა
    let username = localStorage.getItem("app_nickname");
    const modal = document.getElementById("nickname-modal");
    const greeting = document.getElementById("user-greeting");
    
    if (!username) {
        modal.style.display = "flex";
    } else {
        greeting.innerText = `გამარჯობა, ${username}!`;
    }

    document.getElementById("save-nickname-btn").addEventListener("click", () => {
        const inputVal = document.getElementById("nickname-input").value;
        if (inputVal.trim() !== "") {
            localStorage.setItem("app_nickname", inputVal);
            greeting.innerText = `გამარჯობა, ${inputVal}!`;
            modal.style.display = "none";
        }
    });

    // 2. სიდებარის მართვა
    const sidebar = document.getElementById("sidebar");
    document.getElementById("menu-btn").addEventListener("click", () => sidebar.classList.add("active"));
    document.getElementById("close-sidebar").addEventListener("click", () => sidebar.classList.remove("active"));

    // 3. აპლიკაციის ლოგიკა და მონაცემების ჩატვირთვა
    let allWords = [];
    let dailyWords = [];
    let currentIndex = 0;
    
    // ლოქალსთორიჯიდან ვიღებთ გავლილ სიტყვებს
    let learnedWords = JSON.parse(localStorage.getItem("learned_words")) || [];

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allWords = data;
            initDailyWords();
        })
        .catch(err => console.error("მონაცემების ჩატვირთვის შეცდომა:", err));

    function initDailyWords() {
        let savedDaily = JSON.parse(localStorage.getItem("daily_words"));
        let lastDate = localStorage.getItem("last_date");
        let today = new Date().toDateString();

        if (lastDate === today && savedDaily && savedDaily.length > 0) {
            // თუ დღეს უკვე შემოვიდა, ვაგრძელებთ საიდანაც გაჩერდა
            dailyWords = savedDaily;
            currentIndex = parseInt(localStorage.getItem("current_index")) || 0;
        } else {
            // ახალი დღე: ვარჩევთ 20 სიტყვას (2-3 ძველი, 17-18 ახალი)
            dailyWords = generateDailyList();
            currentIndex = 0;
            localStorage.setItem("daily_words", JSON.stringify(dailyWords));
            localStorage.setItem("last_date", today);
            localStorage.setItem("current_index", 0);
        }
        updateUI();
    }

    function generateDailyList() {
        let list = [];
        let oldWordsCount = learnedWords.length >= 3 ? Math.floor(Math.random() * 2) + 2 : learnedWords.length;
        let newWordsCount = 20 - oldWordsCount;

        // ვფილტრავთ ახალ და გავლილ სიტყვებს
        let availableOld = allWords.filter(w => learnedWords.includes(w.id));
        let availableNew = allWords.filter(w => !learnedWords.includes(w.id));

        // ვირჩევთ შემთხვევით ძველ სიტყვებს გამეორებისთვის
        for(let i=0; i < oldWordsCount && availableOld.length > 0; i++) {
            let rand = Math.floor(Math.random() * availableOld.length);
            list.push(availableOld.splice(rand, 1)[0]);
        }

        // ვირჩევთ შემთხვევით ახალ სიტყვებს
        for(let i=0; i < newWordsCount && availableNew.length > 0; i++) {
            let rand = Math.floor(Math.random() * availableNew.length);
            list.push(availableNew.splice(rand, 1)[0]);
        }
        
        // ვურევთ სიას (Shuffle)
        return list.sort(() => Math.random() - 0.5);
    }

    function updateUI() {
        if (currentIndex >= dailyWords.length || currentIndex >= 20) {
            document.getElementById("learning-area").style.display = "none";
            document.getElementById("completion-message").classList.remove("hidden");
            document.getElementById("daily-progress").innerText = `20/20`;
            document.getElementById("daily-bar").style.width = `100%`;
            return;
        }

        let word = dailyWords[currentIndex];
        document.getElementById("german-word").innerText = word.de;
        document.getElementById("phonetics").innerText = word.phonetics;
        document.getElementById("georgian-word").innerText = word.ka;
        
        document.getElementById("translation").classList.add("hidden");
        document.getElementById("reveal-btn").style.display = "inline-block";

        // პროგრესის განახლება
        document.getElementById("daily-progress").innerText = `${currentIndex}/20`;
        document.getElementById("daily-bar").style.width = `${(currentIndex / 20) * 100}%`;
        
        let totalLearned = new Set([...learnedWords, ...dailyWords.slice(0, currentIndex).map(w=>w.id)]).size;
        document.getElementById("total-progress").innerText = `${totalLearned}/${allWords.length}`;
        document.getElementById("total-bar").style.width = `${(totalLearned / allWords.length) * 100}%`;
    }

    // 4. ღილაკების ივენთები
    document.getElementById("reveal-btn").addEventListener("click", (e) => {
        document.getElementById("translation").classList.remove("hidden");
        e.target.style.display = "none";
    });

    document.getElementById("next-word-btn").addEventListener("click", () => {
        let currentWordId = dailyWords[currentIndex].id;
        if (!learnedWords.includes(currentWordId)) {
            learnedWords.push(currentWordId);
            localStorage.setItem("learned_words", JSON.stringify(learnedWords));
        }
        
        currentIndex++;
        localStorage.setItem("current_index", currentIndex);
        updateUI();
    });
});
