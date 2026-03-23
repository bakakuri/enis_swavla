document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;
    tg.expand(); 

    let username = localStorage.getItem("app_nickname");
    const modal = document.getElementById("nickname-modal");
    const greeting = document.getElementById("user-greeting");
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) {
        username = tg.initDataUnsafe.user.first_name;
        localStorage.setItem("app_nickname", username);
    }

    if (!username) {
        modal.style.display = "flex";
    } else {
        greeting.innerText = `გამარჯობა, ${username}!`;
        modal.style.display = "none"; 
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

    fetch('data.json?v=' + new Date().getTime())
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
        if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        document.getElementById("translation").classList.remove("hidden");
        e.target.style.display = "none";
    });

    document.getElementById("next-word-btn").addEventListener("click", () => {
        if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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
        if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
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
                if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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
                if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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
            if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); 
            
            // სტატისტიკისთვის სწორი პასუხის დამახსოვრება
            let c = parseInt(localStorage.getItem("total_correct")) || 0;
            localStorage.setItem("total_correct", c + 1);

            selectedBtn.classList.add("correct");
            feedback.innerText = "✅ სწორია!";
            feedback.className = "feedback-text text-success";
            correctAnswersCount++;
        } else {
            if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error'); 
            
            // სტატისტიკისთვის შეცდომის დამახსოვრება
            let w = parseInt(localStorage.getItem("total_wrong")) || 0;
            localStorage.setItem("total_wrong", w + 1);

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
            if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            
            let c = parseInt(localStorage.getItem("total_correct")) || 0;
            localStorage.setItem("total_correct", c + 1);

            feedback.innerText = "✅ ზუსტია!";
            feedback.className = "feedback-text text-success";
        } else {
            if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            
            let w = parseInt(localStorage.getItem("total_wrong")) || 0;
            localStorage.setItem("total_wrong", w + 1);

            feedback.innerText = `❌ შეცდომაა. სწორია: ${correctSentence}`;
            feedback.className = "feedback-text text-danger";
            let currentWordObj = exerciseWords[currentExIndex];
            if (!incorrectWordsList.some(w => w.id === currentWordObj.id)) incorrectWordsList.push(currentWordObj);
        }
        document.getElementById("check-sentence-btn").classList.add("hidden");
        nextBtn.classList.remove("hidden");
    });

    document.getElementById("next-exercise-btn").addEventListener("click", () => {
        if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        if (exerciseStep === "word") {
            exerciseStep = "sentence"; 
        } else {
            exerciseStep = "word"; 
            currentExIndex++;
        }
        loadExercise();
    });

    function showResults() {
        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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

    // ==========================================
    // ლექსიკონი
    // ==========================================
    const dictArea = document.getElementById("dictionary-area");
    const dictSearch = document.getElementById("dict-search");
    const dictList = document.getElementById("dict-words-list");

    document.getElementById("menu-dict").addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("active");
        hideAllSections();
        dictArea.classList.remove("hidden");
        dictSearch.value = ""; 
        renderDictionary(allWords); 
    });

    document.getElementById("back-from-dict-btn").addEventListener("click", () => {
        dictArea.classList.add("hidden");
        restorePreviousSection();
    });

    function renderDictionary(words) {
        dictList.innerHTML = "";
        words.forEach(word => {
            dictList.innerHTML += `
                <div class="passed-word-item">
                    <span class="compact-de">${word.de}</span>
                    <span class="compact-ph">${word.phonetics}</span>
                    <span class="compact-ka">${word.ka}</span>
                </div>
            `;
        });
    }

    dictSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = allWords.filter(w => w.de.toLowerCase().includes(term) || w.ka.toLowerCase().includes(term));
        renderDictionary(filtered);
    });

    // ==========================================
    // პროფილი და სტატისტიკა (ახალი)
    // ==========================================
    const profileArea = document.getElementById("profile-area");

    document.getElementById("menu-profile").addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("active");
        hideAllSections();
        profileArea.classList.remove("hidden");
        
        // სტატისტიკის დათვლა
        let learned = JSON.parse(localStorage.getItem("learned_words")) || [];
        let reviewQ = JSON.parse(localStorage.getItem("review_queue")) || [];
        let tCorrect = parseInt(localStorage.getItem("total_correct")) || 0;
        let tWrong = parseInt(localStorage.getItem("total_wrong")) || 0;
        
        let totalAnswers = tCorrect + tWrong;
        let accuracy = totalAnswers === 0 ? 0 : Math.round((tCorrect / totalAnswers) * 100);
        let progressPercent = allWords.length === 0 ? 0 : Math.round((learned.length / allWords.length) * 100);
        
        document.getElementById("profile-name").innerText = localStorage.getItem("app_nickname") || "მომხმარებელი";
        document.getElementById("stat-learned").innerText = learned.length;
        document.getElementById("stat-review").innerText = reviewQ.length;
        document.getElementById("stat-accuracy").innerText = `${accuracy}%`;
        document.getElementById("stat-left").innerText = allWords.length - learned.length;
        
        document.getElementById("stat-progress-text").innerText = `${progressPercent}%`;
        document.getElementById("stat-progress-bar").style.width = `${progressPercent}%`;
    });

    document.getElementById("back-from-profile-btn").addEventListener("click", () => {
        profileArea.classList.add("hidden");
        restorePreviousSection();
    });

    // ==========================================
    // საერთო ფუნქციები ეკრანების ცვლისთვის
    // ==========================================
    function hideAllSections() {
        document.getElementById("chat-area").classList.add("hidden");
        document.getElementById("learning-area").classList.add("hidden");
        document.getElementById("completion-message").classList.add("hidden");
        document.getElementById("exercise-area").classList.add("hidden");
        document.getElementById("exercise-results").classList.add("hidden");
        document.getElementById("passed-words-section").style.display = "none";
        document.querySelector(".progress-section").classList.add("hidden");
        dictArea.classList.add("hidden");
        profileArea.classList.add("hidden");
    }

    function restorePreviousSection() {
        document.querySelector(".progress-section").classList.remove("hidden");
        if (currentIndex >= 20 || currentIndex >= dailyWords.length) {
            if (exerciseWords && exerciseWords.length > 0) {
                if (currentExIndex >= exerciseWords.length) {
                    document.getElementById("exercise-results").classList.remove("hidden");
                } else {
                    document.getElementById("exercise-area").classList.remove("hidden");
                }
            } else {
                document.getElementById("completion-message").classList.remove("hidden");
            }
        } else {
            document.getElementById("learning-area").classList.remove("hidden");
            if (currentIndex > 0) document.getElementById("passed-words-section").style.display = "block";
        }
    }

    document.getElementById("menu-reset").addEventListener("click", () => {
        if(confirm("ნამდვილად გსურთ მთლიანი პროგრესის განულება? წაიშლება თქვენი გავლილი სიტყვები.")) {
            localStorage.clear();
            location.reload(); 
        }
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
    // ==========================================
    // დიალოგების სიმულაცია (Chat Mode)
    // ==========================================
    const chatArea = document.getElementById("chat-area");
    const scenariosList = document.getElementById("chat-scenarios-list");
    const chatWindow = document.getElementById("chat-window");
    const chatMessages = document.getElementById("chat-messages");
    const chatChoices = document.getElementById("chat-choices");

    // წინასწარ გამზადებული დიალოგები
    const scenarios = [
        {
            title: "👋 გაცნობა",
            steps: [
                { bot: "Hallo! Wie geht es dir? (გამარჯობა! როგორ ხარ?)", choices: [{text: "Mir geht es gut, danke. Und dir?", correct: true}, {text: "Ich komme aus Georgien.", correct: false}] },
                { bot: "Auch gut! Woher kommst du? (მეც კარგად! საიდან ხარ?)", choices: [{text: "Ich bin 20 Jahre alt.", correct: false}, {text: "Ich komme aus Georgien.", correct: true}] },
                { bot: "Schön! Sprichst du Deutsch? (კარგია! გერმანულად საუბრობ?)", choices: [{text: "Ja, ein bisschen.", correct: true}, {text: "Ich esse Pizza.", correct: false}] },
                { bot: "Super! Viel Erfolg noch! Tschüss! (სუპერ! წარმატებები! ნახვამდის!)", choices: [{text: "Danke! Tschüss!", correct: true}, {text: "Bitte sehr.", correct: false}], end: true }
            ]
        },
        {
    title: "🤝 გაცნობა (ვრცელი)",
    steps: [
        { 
            bot: "Hallo! Ich bin Lukas. Wie heißt du? (გამარჯობა! მე ლუკასი ვარ. შენ რა გქვია?)", 
            choices: [
                {text: "Ich heiße Giorgi. Freut mich!", correct: true}, 
                {text: "Ich bin aus Georgien.", correct: false}
            ] 
        },
        { 
            bot: "Freut mich auch, Giorgi! Wie alt bist du? (მეც მიხარია, გიორგი! რამდენი წლის ხარ?)", 
            choices: [
                {text: "Ich komme aus Tiflis.", correct: false}, 
                {text: "Ich bin 25 Jahre alt. Und du?", correct: true}
            ] 
        },
        { 
            bot: "Ich bin 28. Wo wohnst du zurzeit? (მე 28-ის. ამჟამად სად ცხოვრობ?)", 
            choices: [
                {text: "Ich wohne jetzt in Hamburg.", correct: true}, 
                {text: "Ich schlafe viel.", correct: false}
            ] 
        },
        { 
            bot: "Hamburg ist toll! Was machst du beruflich? (ჰამბურგი მაგარია! პროფესიით რას საქმიანობ?)", 
            choices: [
                {text: "Ich bin Webentwickler.", correct: true}, 
                {text: "Ich esse gern Pizza.", correct: false}
            ] 
        },
        { 
            bot: "Interessant! Lernst du schon lange Deutsch? (საინტერესოა! დიდი ხანია გერმანულს სწავლობ?)", 
            choices: [
                {text: "Nein, erst seit zwei Monaten.", correct: true}, 
                {text: "Ja, ich habe ein Auto.", correct: false}
            ] 
        },
        { 
            bot: "Du sprichst schon sehr gut! Viel Erfolg noch. (უკვე ძალიან კარგად საუბრობ! წარმატებები.)", 
            choices: [
                {text: "Vielen Dank! Bis bald!", correct: true}, 
                {text: "Guten Appetit.", correct: false}
            ], 
            end: true 
        }
    ]
        },
        {
            title: "☕ კაფეში",
            steps: [
                { bot: "Guten Tag! Was möchten Sie trinken? (გამარჯობა! რის დალევას ისურვებდით?)", choices: [{text: "Einen Kaffee, bitte.", correct: true}, {text: "Ich heiße Anna.", correct: false}] },
                { bot: "Mit Milch und Zucker? (რძით და შაქრით?)", choices: [{text: "Ich wohne hier.", correct: false}, {text: "Nur mit Milch, danke.", correct: true}] },
                { bot: "Gerne. Das macht 3 Euro, bitte. (სიამოვნებით. 3 ევრო იქნება.)", choices: [{text: "Hier, bitte schön.", correct: true}, {text: "Mir geht es gut.", correct: false}] },
                { bot: "Danke! Einen schönen Tag noch! (მადლობა! სასიამოვნო დღეს გისურვებთ!)", choices: [{text: "Danke, gleichfalls!", correct: true}, {text: "Nein, danke.", correct: false}], end: true }
            ]
        },
        {
    title: "🛍️ მაღაზიაში",
    steps: [
        { bot: "Brauchen Sie eine Tüte? (პარკი გჭირდებათ?)", choices: [{text: "Ja, bitte. Eine kleine.", correct: true}, {text: "Ich bin müde.", correct: false}] },
        { bot: "Haben Sie eine Kundenkarte? (კლიენტის ბარათი გაქვთ?)", choices: [{text: "Nein, leider nicht.", correct: true}, {text: "Das Wetter ist gut.", correct: false}] },
        { bot: "Das macht 15 Euro, bitte. (15 ევრო იქნება, თუ შეიძლება.)", choices: [{text: "Kann ich mit Karte bezahlen?", correct: true}, {text: "Ich heiße Giorgi.", correct: false}] },
        { bot: "Ja, natürlich. Halten Sie die Karte hier. (დიახ, რა თქმა უნდა. ბარათი აქ მიადეთ.)", choices: [{text: "Danke, schönen Feierabend!", correct: true}, {text: "Ich komme aus Georgien.", correct: false}], end: true }
    ]
},
{
    title: "🚇 ტრანსპორტში",
    steps: [
        { bot: "Entschuldigung, fährt dieser Bus zum Hauptbahnhof? (უკაცრავად, ეს ავტობუსი ცენტრალურ სადგურამდე მიდის?)", choices: [{text: "Ja, in zehn Minuten.", correct: true}, {text: "Ich esse Brot.", correct: false}] },
        { bot: "Ist dieser Platz noch frei? (ეს ადგილი თავისუფალია?)", choices: [{text: "Ja, bitte setzen Sie sich.", correct: true}, {text: "Nein, ich lerne Deutsch.", correct: false}] },
        { bot: "Ihren Fahrschein, bitte! (თქვენი ბილეთი, თუ შეიძლება!)", choices: [{text: "Hier ist mein Ticket.", correct: true}, {text: "Das ist teuer.", correct: false}] },
        { bot: "Vielen Dank, alles in Ordnung. (დიდი მადლობა, ყველაფერი რიგზეა.)", choices: [{text: "Einen schönen Tag noch!", correct: true}, {text: "Gute Nacht.", correct: false}], end: true }
    ]
},
{
    title: "🏥 ექიმთან",
    steps: [
        { bot: "Guten Tag, haben Sie einen Termin? (გამარჯობა, ჩაწერილი ხართ?)", choices: [{text: "Ja, um zehn Uhr.", correct: true}, {text: "Ich bin groß.", correct: false}] },
        { bot: "Was fehlt Ihnen? (რა გაწუხებთ?)", choices: [{text: "Ich habe Kopfschmerzen.", correct: true}, {text: "Ich wohne in Hamburg.", correct: false}] },
        { bot: "Haben Sie Ihre Versicherungskarte dabei? (სადაზღვევო ბარათი თან გაქვთ?)", choices: [{text: "Ja, hier bitte schön.", correct: true}, {text: "Nein, ich trinke Tee.", correct: false}] },
        { bot: "Bitte nehmen Sie im Wartezimmer Platz. (გთხოვთ, მისაღებში დაიკავოთ ადგილი.)", choices: [{text: "Vielen Dank.", correct: true}, {text: "Gleichfalls.", correct: false}], end: true }
    ]
},
{
    title: "🏦 ბანკში",
    steps: [
        { bot: "Guten Tag! Wie kann ich Ihnen helfen? (გამარჯობა! რით შემიძლია დაგეხმაროთ?)", choices: [{text: "Ich möchte ein Konto eröffnen.", correct: true}, {text: "Ich suche den Bahnhof.", correct: false}] },
        { bot: "Haben Sie Ihren Ausweis dabei? (პირადობის მოწმობა თან გაქვთ?)", choices: [{text: "Ja, hier ist mein Reisepass.", correct: true}, {text: "Nein, das ist billig.", correct: false}] },
        { bot: "Füllen Sie bitte dieses Formular aus. (გთხოვთ, ეს ფორმულარი შეავსოთ.)", choices: [{text: "Brauche ich einen Kuli?", correct: true}, {text: "Ich bin glücklich.", correct: false}] },
        { bot: "Hier ist ein Stift. (ინებეთ კალამი.)", choices: [{text: "Danke, ich bin fertig.", correct: true}, {text: "Bitte sehr.", correct: false}], end: true }
    ]
},
        
    ];

    let currentScenario = null;
    let currentChatStep = 0;

    // მენიუდან ჩატის გამოძახება
    document.getElementById("menu-chat").addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("active");
        hideAllSections();
        chatArea.classList.remove("hidden");
        scenariosList.style.display = "flex";
        chatWindow.classList.add("hidden");
        renderScenarios();
    });

    // ეკრანიდან უკან გამოსვლა
    document.getElementById("back-from-chat-btn").addEventListener("click", () => {
        if (!chatWindow.classList.contains("hidden")) {
            // თუ ჩატშია, დაბრუნდეს სიტუაციების სიაში
            chatWindow.classList.add("hidden");
            scenariosList.style.display = "flex";
        } else {
            // თუ სიაშია, გამოვიდეს საერთოდ
            chatArea.classList.add("hidden");
            restorePreviousSection();
        }
    });

    function renderScenarios() {
        scenariosList.innerHTML = "";
        scenarios.forEach((scenario, index) => {
            let btn = document.createElement("button");
            btn.className = "chat-choice-btn";
            btn.style.textAlign = "center";
            btn.innerText = scenario.title;
            btn.onclick = () => startChat(index);
            scenariosList.appendChild(btn);
        });
    }

    function startChat(index) {
        currentScenario = scenarios[index];
        currentChatStep = 0;
        scenariosList.style.display = "none";
        chatWindow.classList.remove("hidden");
        chatMessages.innerHTML = "";
        playNextChatStep();
    }

    function playNextChatStep() {
        if (currentChatStep >= currentScenario.steps.length) return;
        
        let step = currentScenario.steps[currentChatStep];
        
        // ბოტის მესიჯის დახატვა
        setTimeout(() => {
            if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            let msgDiv = document.createElement("div");
            msgDiv.className = "chat-msg chat-bot";
            msgDiv.innerText = step.bot;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight; // სქროლი სულ ქვემოთ
            
            renderChatChoices(step);
        }, 600); // 0.6 წამიანი დაყოვნება რეალისტურობისთვის
    }

    function renderChatChoices(step) {
        chatChoices.innerHTML = "";
        
        // ვურევთ პასუხებს, რომ ყოველთვის ერთ ადგილას არ იყოს სწორი პასუხი
        let shuffledChoices = [...step.choices].sort(() => Math.random() - 0.5);

        shuffledChoices.forEach(choice => {
            let btn = document.createElement("button");
            btn.className = "chat-choice-btn";
            btn.innerText = choice.text;
            btn.onclick = () => {
                if (choice.correct) {
                    // სწორი პასუხი
                    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                    chatChoices.innerHTML = "";
                    
                    let userMsg = document.createElement("div");
                    userMsg.className = "chat-msg chat-user";
                    userMsg.innerText = choice.text;
                    chatMessages.appendChild(userMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    if (step.end) {
                        setTimeout(() => {
                            let endMsg = document.createElement("div");
                            endMsg.className = "chat-msg chat-bot";
                            endMsg.style.background = "var(--success-bg)";
                            endMsg.style.color = "var(--success)";
                            endMsg.style.textAlign = "center";
                            endMsg.style.alignSelf = "center";
                            endMsg.innerText = "🎉 დიალოგი წარმატებით დასრულდა!";
                            chatMessages.appendChild(endMsg);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }, 800);
                    } else {
                        currentChatStep++;
                        playNextChatStep();
                    }
                } else {
                    // არასწორი პასუხი
                    if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                    btn.classList.add("wrong-choice");
                    setTimeout(() => btn.classList.remove("wrong-choice"), 400);
                }
            };
            chatChoices.appendChild(btn);
        });
    }

    // ეს ხაზი უნდა დავამატოთ `hideAllSections` ფუნქციაშიც (მოძებნე ეგ ფუნქცია და შიგნით ჩაუწერე):
    // document.getElementById("chat-area").classList.add("hidden");
});
