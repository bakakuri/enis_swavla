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
        .catch(err => console.error("Error loading JSON:", err));

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
            if (w && !list.some(x => x.id === id)) list.push(w);
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
        let totalLearned = new Set(learnedWords).size;

        if (currentIndex >= dailyWords.length || currentIndex >= 20) {
            document.getElementById("learning-area").classList.add("hidden");
            document.getElementById("completion-message").classList.remove("hidden");
            document.getElementById("daily-progress").innerText = `20/20`;
            document.getElementById("daily-bar").style.width = `100%`;
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

    let exerciseWords = [];
    let currentExIndex = 0;
    let exerciseStep = "word"; 
    let currentCorrectAnswer = "";
    let correctAnswersCount = 0;
    let incorrectWordsList = [];
    
    let currentSentenceWords = [];
    let selectedSentenceWords = [];

    const exerciseBtn = document.getElementById("exercise-btn");
    const exerciseArea = document.getElementById("exercise-area");
    const mcContainer = document.getElementById("multiple-choice-container");
    const sentenceContainer = document.getElementById("sentence-builder-container");
    const feedback = document.getElementById("exercise-feedback");
    const nextBtn = document.getElementById("next-exercise-btn");
    const questionEl = document.getElementById("exercise-question");
    
    exerciseBtn.addEventListener("click", () => {
        document.getElementById("learning-area").classList.add("hidden");
        document.getElementById("completion-message").classList.add("hidden");
        document.getElementById("passed-words-section").style.display = "none"; 
        
        correctAnswersCount = 0;
        incorrectWordsList = [];
        exerciseArea.classList.remove("hidden");
        
        exerciseWords = [...dailyWords].sort(() => Math.random() - 0.5);
        currentExIndex = 0;
        exerciseStep = "word"; 
        loadExercise();
    });

    function loadExercise() {
        if (currentExIndex >= exerciseWords.length) {
            exerciseArea.classList.add("hidden");
            showResults(); 
            return;
        }

        const word = exerciseWords[currentExIndex];
        feedback.innerText = "";
        nextBtn.classList.add("hidden");
        document.getElementById("exercise-progress").innerText = `${currentExIndex}/20`;
        document.getElementById("exercise-bar").style.width = `${(currentExIndex / 20) * 100}%`;

        // თუ წინადადება არ აქვს, ვახტებით
        if (exerciseStep === "sentence" && (!word.example_de || !word.example_ka)) {
            exerciseStep = "word";
            currentExIndex++;
            return loadExercise(); 
        }

        if (exerciseStep === "word") {
            mcContainer.classList.remove("hidden");
            sentenceContainer.classList.add("hidden");
            questionEl.style.display = "block";

            let isGeoToGer = Math.random() > 0.5;
            let options = [word];
            while (options.length < 4) {
                let randomWord = allWords[Math.floor(Math.random() * allWords.length)];
                if (!options.some(o => o.id === randomWord.id)) options.push(randomWord);
            }
            options.sort(() => Math.random() - 0.5); 

            const optionBtns = document.querySelectorAll(".option-btn");
            if (isGeoToGer) {
                questionEl.innerHTML = word.ka; 
                optionBtns.forEach((btn, index) => {
                    let optWord = options[index];
                    btn.innerHTML = `${optWord.de} <br><span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px;">${optWord.phonetics}</span>`;
                    btn.className = "option-btn"; 
                    btn.isCorrectOption = (optWord.id === word.id);
                    btn.onclick = () => checkMultipleChoice(btn, word.de, word);
                });
            } else {
                questionEl.innerHTML = `${word.de} <br><span style="font-size: 15px; font-weight: normal; color: var(--text-muted); display: block; margin-top: 6px;">${word.phonetics}</span>`;
                optionBtns.forEach((btn, index) => {
                    let optWord = options[index];
                    btn.innerHTML = optWord.ka; 
                    btn.className = "option-btn"; 
                    btn.isCorrectOption = (optWord.id === word.id);
                    btn.onclick = () => checkMultipleChoice(btn, word.ka, word);
                });
            }
        } else {
            mcContainer.classList.add("hidden");
            sentenceContainer.classList.remove("hidden");
            questionEl.style.display = "none";
            document.getElementById("check-sentence-btn").classList.remove("hidden");

            document.getElementById("sentence-ka").innerText = `ააწყვე: "${word.example_ka}"`;
            currentSentenceWords = word.example_de.split(" ").sort(() => Math.random() - 0.5);
            selectedSentenceWords = [];
            renderSentenceBuilder();
        }
    }

    function renderSentenceBuilder() {
        const answerArea = document.getElementById("sentence-answer-area");
        const poolArea = document.getElementById("sentence-word-pool");
        answerArea.innerHTML = "";
        poolArea.innerHTML = "";

        selectedSentenceWords.forEach((w, index) => {
            let btn = document.createElement("button");
            btn.className = "sentence-word-btn";
            btn.innerText = w;
            btn.onclick = () => {
                selectedSentenceWords.splice(index, 1);
                currentSentenceWords.push(w);
                renderSentenceBuilder();
            };
            answerArea.appendChild(btn);
        });

        currentSentenceWords.forEach((w, index) => {
            let btn = document.createElement("button");
            btn.className = "sentence-word-btn";
            btn.innerText = w;
            btn.onclick = () => {
                currentSentenceWords.splice(index, 1);
                selectedSentenceWords.push(w);
                renderSentenceBuilder();
            };
            poolArea.appendChild(btn);
        });
    }

    function checkMultipleChoice(selectedBtn, correctText, currentWordObj) {
        const optionBtns = document.querySelectorAll(".option-btn");
        optionBtns.forEach(btn => btn.onclick = null); 

        if (selectedBtn.isCorrectOption) {
            selectedBtn.classList.add("correct");
            feedback.innerText = "✅ სწორია!";
            feedback.className = "feedback-text text-success";
            correctAnswersCount++;
        } else {
            selectedBtn.classList.add("wrong");
            feedback.innerText = `❌ შეცდომაა. სწორია: ${correctText}`;
            feedback.className = "feedback-text text-danger";
            optionBtns.forEach(btn => { if (btn.isCorrectOption) btn.classList.add("correct"); });
            if (!incorrectWordsList.some(w => w.id === currentWordObj.id)) incorrectWordsList.push(currentWordObj);
        }
        nextBtn.classList.remove("hidden");
    }

    document.getElementById("check-sentence-btn").addEventListener("click", () => {
        let userSentence = selectedSentenceWords.join(" ");
        let correctSentence = exerciseWords[currentExIndex].example_de;
        
        if (userSentence.trim() === correctSentence.trim()) {
            feedback.innerText = "✅ ზუსტია!";
            feedback.className = "feedback-text text-success";
        } else {
            feedback.innerText = `❌ შეცდომაა. სწორია: ${correctSentence}`;
            feedback.className = "feedback-text text-danger";
            let currentWordObj = exerciseWords[currentExIndex];
            if (!incorrectWordsList.some(w => w.id === currentWordObj.id)) incorrectWordsList.push(currentWordObj);
        }
        document.getElementById("check-sentence-btn").classList.add("hidden");
        nextBtn.classList.remove("hidden");
    });

    document.getElementById("next-exercise-btn").addEventListener("click", () => {
        if (exerciseStep === "word") {
            exerciseStep = "sentence"; 
        } else {
            exerciseStep = "word"; 
            currentExIndex++;
        }
        loadExercise();
    });

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
                        <span class="compact-de">${word.de}</span>
                        <span class="compact-ph">${word.phonetics}</span>
                        <span class="compact-ka">${word.ka}</span>
                    </div>`;
            });
            let reviewQueue = JSON.parse(localStorage.getItem("review_queue")) || [];
            incorrectWordsList.forEach(w => { if(!reviewQueue.includes(w.id)) reviewQueue.push(w.id); });
            localStorage.setItem("review_queue", JSON.stringify(reviewQueue));
        } else {
            mistakesContainer.classList.add("hidden");
        }
    }

    document.getElementById("finish-daily-btn").addEventListener("click", () => {
        let learned = JSON.parse(localStorage.getItem("learned_words")) || [];
        if (learned.length >= allWords.length) {
            alert("🏆 გილოცავთ! თქვენ წარმატებით დაასრულეთ სრული კურსი (" + allWords.length + " სიტყვა). პროგრესი ახლა განულდება და შეგიძლიათ დაიწყოთ თავიდან.");
            localStorage.clear();
            location.reload();
            return;
        }
        localStorage.removeItem("daily_words");
        localStorage.removeItem("current_index");
        localStorage.removeItem("last_date"); 
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
                listContainer.innerHTML += `
                    <div class="passed-word-item">
                        <span class="compact-de">${word.de}</span>
                        <span class="compact-ph">${word.phonetics}</span>
                        <span class="compact-ka">${word.ka}</span>
                    </div>`;
            }
        } else {
            section.style.display = "none";
        }
    }
});
