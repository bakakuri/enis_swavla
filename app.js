document.addEventListener("DOMContentLoaded", () => {
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

    const sidebar = document.getElementById("sidebar");
    document.getElementById("menu-btn").addEventListener("click", () => sidebar.classList.add("active"));
    document.getElementById("close-sidebar").addEventListener("click", () => sidebar.classList.remove("active"));

    let allWords = [];
    let dailyWords = [];
    let currentIndex = 0;
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
            dailyWords = savedDaily;
            currentIndex = parseInt(localStorage.getItem("current_index")) || 0;
        } else {
            dailyWords = generateDailyList();
            currentIndex = 0;
            localStorage.setItem("daily_words", JSON.stringify(dailyWords));
            localStorage.setItem("last_date", today);
            localStorage.setItem("current_index", 0);
        }
        updateUI();
        renderPassedWords(); 
    }

    function generateDailyList() {
        let list = [];
        let reviewQueue = JSON.parse(localStorage.getItem("review_queue")) || [];
        let remainingReview = [...reviewQueue];
        
        while(remainingReview.length > 0 && list.length < 20) {
            let id = remainingReview.shift();
            let w = allWords.find(x => x.id === id);
            if (w && !list.some(x => x.id === id)) {
                list.push(w);
            }
        }
        localStorage.setItem("review_queue", JSON.stringify(remainingReview)); 

        let needed = 20 - list.length;
        if (needed > 0) {
            let oldWordsCount = learnedWords.length >= 3 ? Math.floor(Math.random() * 2) + 2 : learnedWords.length;
            if (oldWordsCount > needed) oldWordsCount = needed; 
            
            let availableOld = allWords.filter(w => learnedWords.includes(w.id) && !list.some(x => x.id === w.id));
            let availableNew = allWords.filter(w => !learnedWords.includes(w.id) && !list.some(x => x.id === w.id));

            for(let i=0; i < oldWordsCount && availableOld.length > 0; i++) {
                let rand = Math.floor(Math.random() * availableOld.length);
                list.push(availableOld.splice(rand, 1)[0]);
            }
            
            let stillNeeded = 20 - list.length;
            for(let i=0; i < stillNeeded && availableNew.length > 0; i++) {
                let rand = Math.floor(Math.random() * availableNew.length);
                list.push(availableNew.splice(rand, 1)[0]);
            }
        }
        return list.sort(() => Math.random() - 0.5); 
    }

    function updateUI() {
        // საერთო პროგრესის ზუსტი კალკულაცია
        let totalLearned = new Set(learnedWords).size;

        if (currentIndex >= dailyWords.length || currentIndex >= 20) {
            document.getElementById("learning-area").classList.add("hidden");
            document.getElementById("completion-message").classList.remove("hidden");
            document.getElementById("daily-progress").innerText = `20/20`;
            document.getElementById("daily-bar").style.width = `100%`;
            
            // აქ დაემატა განახლება ბოლო სიტყვისთვის, რომ აღარ გაიჭედოს 19-ზე
            document.getElementById("total-progress").innerText = `${totalLearned}/${allWords.length}`;
            document.getElementById("total-bar").style.width = `${(totalLearned / allWords.length) * 100}%`;
            return;
        }

        let word = dailyWords[currentIndex];
        document.getElementById("german-word").innerText = word.de;
        document.getElementById("phonetics").innerText = word.phonetics;
        document.getElementById("georgian-word").innerText = word.ka;
        
        document.getElementById("translation").classList.add("hidden");
        document.getElementById("reveal-btn").style.display = "inline-block";

        document.getElementById("daily-progress").innerText = `${currentIndex}/20`;
        document.getElementById("daily-bar").style.width = `${(currentIndex / 20) * 100}%`;
        
        document.getElementById("total-progress").innerText = `${totalLearned}/${allWords.length}`;
        document.getElementById("total-bar").style.width = `${(totalLearned / allWords.length) * 100}%`;
    }

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
        renderPassedWords(); 
    });

    // სავარჯიშოების ლოგიკა და რეზულტატები
    let exerciseWords = [];
    let currentExIndex = 0;
    let currentCorrectAnswer = "";
    let correctAnswersCount = 0;
    let incorrectWordsList = [];

    const exerciseBtn = document.getElementById("exercise-btn");
    const exerciseArea = document.getElementById("exercise-area");
    
    exerciseBtn.addEventListener("click", () => {
        document.getElementById("learning-area").classList.add("hidden");
        document.getElementById("completion-message").classList.add("hidden");
        document.getElementById("passed-words-section").style.display = "none"; 
        
        correctAnswersCount = 0;
        incorrectWordsList = [];
        exerciseArea.classList.remove("hidden");
        
        exerciseWords = [...dailyWords].sort(() => Math.random() - 0.5);
        currentExIndex = 0;
        loadExercise();
    });

    function loadExercise() {
        if (currentExIndex >= exerciseWords.length) {
            exerciseArea.classList.add("hidden");
            showResults(); 
            return;
        }

        const word = exerciseWords[currentExIndex];
        const questionEl = document.getElementById("exercise-question");
        const feedback = document.getElementById("exercise-feedback");
        const nextBtn = document.getElementById("next-exercise-btn");

        feedback.innerText = "";
        nextBtn.classList.add("hidden");

        document.getElementById("exercise-progress").innerText = `${currentExIndex}/20`;
        document.getElementById("exercise-bar").style.width = `${(currentExIndex / 20) * 100}%`;

        let isGeoToGer = Math.random() > 0.5;
        questionEl.innerText = isGeoToGer ? word.ka : word.de; 
        currentCorrectAnswer = isGeoToGer ? word.de : word.ka;

        let options = [currentCorrectAnswer];
        while (options.length < 4) {
            let randomWord = allWords[Math.floor(Math.random() * allWords.length)];
            let randomOption = isGeoToGer ? randomWord.de : randomWord.ka;
            if (!options.includes(randomOption)) {
                options.push(randomOption);
            }
        }
        options.sort(() => Math.random() - 0.5); 

        const optionBtns = document.querySelectorAll(".option-btn");
        optionBtns.forEach((btn, index) => {
            btn.innerText = options[index];
            btn.className = "option-btn"; 
            btn.onclick = () => checkMultipleChoice(btn, currentCorrectAnswer, word);
        });
    }

    function checkMultipleChoice(selectedBtn, correctText, currentWordObj) {
        const optionBtns = document.querySelectorAll(".option-btn");
        const feedback = document.getElementById("exercise-feedback");
        
        optionBtns.forEach(btn => btn.onclick = null); 

        if (selectedBtn.innerText === correctText) {
            selectedBtn.classList.add("correct");
            feedback.innerText = "✅ სწორია!";
            feedback.className = "feedback-text text-success";
            correctAnswersCount++;
        } else {
            selectedBtn.classList.add("wrong");
            feedback.innerText = `❌ შეცდომაა. სწორია: ${correctText}`;
            feedback.className = "feedback-text text-danger";
            
            optionBtns.forEach(btn => {
                if (btn.innerText === correctText) btn.classList.add("correct");
            });
            
            if (!incorrectWordsList.some(w => w.id === currentWordObj.id)) {
                incorrectWordsList.push(currentWordObj);
            }
        }
        document.getElementById("next-exercise-btn").classList.remove("hidden");
    }

    document.getElementById("next-exercise-btn").addEventListener("click", () => {
        currentExIndex++;
        loadExercise();
    });

    // რეზულტატების დახატვის ფუნქცია
    function showResults() {
        const resultsSection = document.getElementById("exercise-results");
        resultsSection.classList.remove("hidden");
        
        document.getElementById("correct-count").innerText = correctAnswersCount;
        document.getElementById("incorrect-count").innerText = incorrectWordsList.length;
        
        const mistakesContainer = document.getElementById("mistakes-container");
        const mistakesList = document.getElementById("mistakes-list");
        mistakesList.innerHTML = "";
        
        if (incorrectWordsList.length > 0) {
            mistakesContainer.classList.remove("hidden");
            
            incorrectWordsList.forEach(word => {
                mistakesList.innerHTML += `
                    <div class="passed-word-item" style="border-left-color: var(--danger);">
                        <div class="word-row">
                            <span class="passed-word-de">${word.de}</span>
                            <span class="passed-word-ka">${word.ka}</span>
                        </div>
                    </div>
                `;
            });
            
            let reviewQueue = JSON.parse(localStorage.getItem("review_queue")) || [];
            incorrectWordsList.forEach(w => {
                if(!reviewQueue.includes(w.id)) reviewQueue.push(w.id);
            });
            localStorage.setItem("review_queue", JSON.stringify(reviewQueue));
        } else {
            mistakesContainer.classList.add("hidden");
        }
    }

    document.getElementById("finish-daily-btn").addEventListener("click", () => {
        alert("დღევანდელი მისია შესრულებულია! 🎉 გელოდებით ხვალ.");
        location.reload(); 
    });

    document.getElementById("menu-reset").addEventListener("click", () => {
        if(confirm("ნამდვილად გსურთ მთლიანი პროგრესის განულება? წაიშლება თქვენი გავლილი სიტყვები.")) {
            localStorage.clear();
            location.reload(); 
        }
    });

    document.getElementById("menu-dict").addEventListener("click", () => {
        alert("ლექსიკონის სრული ბაზა მალე დაემატება!");
        document.getElementById("sidebar").classList.remove("active");
    });

    document.getElementById("menu-settings").addEventListener("click", () => {
        alert("პარამეტრების განყოფილება მალე დაემატება!");
        document.getElementById("sidebar").classList.remove("active");
    });

    function renderPassedWords() {
        const listContainer = document.getElementById("passed-words-list");
        const section = document.getElementById("passed-words-section");
        
        if (!listContainer || !section) return; 
        
        listContainer.innerHTML = ""; 
        
        if (currentIndex > 0) {
            section.style.display = "block";
            
            let limit = Math.min(currentIndex, dailyWords.length);
            for (let i = 0; i < limit; i++) {
                let word = dailyWords[i];
                if(!word) continue;
                let wordHTML = `
                    <div class="passed-word-item">
                        <div class="word-row">
                            <span class="passed-word-de">${word.de}</span>
                            <span class="passed-word-ka">${word.ka}</span>
                        </div>
                        <span class="passed-word-ph">${word.phonetics}</span>
                    </div>
                `;
                listContainer.innerHTML += wordHTML;
            }
        } else {
            section.style.display = "none";
        }
    }
});
    
