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
        let oldWordsCount = learnedWords.length >= 3 ? Math.floor(Math.random() * 2) + 2 : learnedWords.length;
        let newWordsCount = 20 - oldWordsCount;

        let availableOld = allWords.filter(w => learnedWords.includes(w.id));
        let availableNew = allWords.filter(w => !learnedWords.includes(w.id));

        for(let i=0; i < oldWordsCount && availableOld.length > 0; i++) {
            let rand = Math.floor(Math.random() * availableOld.length);
            list.push(availableOld.splice(rand, 1)[0]);
        }

        for(let i=0; i < newWordsCount && availableNew.length > 0; i++) {
            let rand = Math.floor(Math.random() * availableNew.length);
            list.push(availableNew.splice(rand, 1)[0]);
        }
        
        return list.sort(() => Math.random() - 0.5);
    }

    function updateUI() {
        if (currentIndex >= dailyWords.length || currentIndex >= 20) {
            document.getElementById("learning-area").classList.add("hidden");
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

        document.getElementById("daily-progress").innerText = `${currentIndex}/20`;
        document.getElementById("daily-bar").style.width = `${(currentIndex / 20) * 100}%`;
        
        let totalLearned = new Set([...learnedWords, ...dailyWords.slice(0, currentIndex).map(w=>w.id)]).size;
        document.getElementById("total-progress").innerText = `${totalLearned}/${allWords.length}`;
        document.getElementById("total-bar").style.width = `${(totalLearned / allWords.length) * 100}%`;
    }

    // ღილაკების ივენთები
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

    // ==========================================
    // სავარჯიშოების ლოგიკა
    // ==========================================
    let exerciseWords = [];
    let currentExIndex = 0;
    let currentCorrectAnswer = "";

    const exerciseBtn = document.getElementById("exercise-btn");
    const exerciseArea = document.getElementById("exercise-area");
    
    exerciseBtn.addEventListener("click", () => {
        document.getElementById("learning-area").classList.add("hidden");
        document.getElementById("completion-message").classList.add("hidden");
        document.getElementById("passed-words-section").classList.add("hidden"); // ვმალავთ სიას სავარჯიშოს დროს
        
        exerciseArea.classList.remove("hidden");
        
        exerciseWords = [...dailyWords].sort(() => Math.random() - 0.5);
        currentExIndex = 0;
        loadExercise();
    });

    function loadExercise() {
        if (currentExIndex >= exerciseWords.length) {
            exerciseArea.innerHTML = `<div style="text-align:center; padding:30px;">
                <h2>🎉 იდეალურია!</h2><p>დღევანდელი სავარჯიშოები დასრულებულია.</p>
            </div>`;
            return;
        }

        const word = exerciseWords[currentExIndex];
        const questionEl = document.getElementById("exercise-question");
        const mcContainer = document.getElementById("multiple-choice-container");
        const typeContainer = document.getElementById("typing-container");
        const feedback = document.getElementById("exercise-feedback");
        const nextBtn = document.getElementById("next-exercise-btn");
        const typingInput = document.getElementById("typing-input");

        feedback.innerText = "";
        nextBtn.classList.add("hidden");
        typingInput.value = "";
        typingInput.style.borderColor = "#e0e0e0";

        document.getElementById("exercise-progress").innerText = `${currentExIndex}/20`;
        document.getElementById("exercise-bar").style.width = `${(currentExIndex / 20) * 100}%`;

        let exerciseType = Math.random() > 0.5 ? "multipleChoice" : "typing";

        if (exerciseType === "multipleChoice") {
            mcContainer.classList.remove("hidden");
            typeContainer.classList.add("hidden");
            
            questionEl.innerText = word.ka; 
            currentCorrectAnswer = word.de;

            let options = [word.de];
            while (options.length < 4) {
                let randomWord = allWords[Math.floor(Math.random() * allWords.length)].de;
                if (!options.includes(randomWord)) {
                    options.push(randomWord);
                }
            }
            options.sort(() => Math.random() - 0.5); 

            const optionBtns = document.querySelectorAll(".option-btn");
            optionBtns.forEach((btn, index) => {
                btn.innerText = options[index];
                btn.className = "option-btn"; 
                btn.onclick = () => checkMultipleChoice(btn, currentCorrectAnswer);
            });
        } else {
            mcContainer.classList.add("hidden");
            typeContainer.classList.remove("hidden");
            
            questionEl.innerText = `როგორ არის გერმანულად: "${word.ka}"?`;
            currentCorrectAnswer = word.de;
        }
    }

    function checkMultipleChoice(selectedBtn, correctText) {
        const optionBtns = document.querySelectorAll(".option-btn");
        const feedback = document.getElementById("exercise-feedback");
        
        optionBtns.forEach(btn => btn.onclick = null);

        if (selectedBtn.innerText === correctText) {
            selectedBtn.classList.add("correct");
            feedback.innerText = "✅ სწორია!";
            feedback.className = "feedback-text text-success";
        } else {
            selectedBtn.classList.add("wrong");
            feedback.innerText = `❌ შეცდომაა. სწორი პასუხია: ${correctText}`;
            feedback.className = "feedback-text text-danger";
            
            optionBtns.forEach(btn => {
                if (btn.innerText === correctText) btn.classList.add("correct");
            });
        }
        document.getElementById("next-exercise-btn").classList.remove("hidden");
    }

    document.getElementById("check-typing-btn").addEventListener("click", () => {
        const typingInput = document.getElementById("typing-input");
        const feedback = document.getElementById("exercise-feedback");
        let userAnswer = typingInput.value.trim().toLowerCase();
        let correctAnswer = currentCorrectAnswer.toLowerCase();

        if (userAnswer === correctAnswer) {
            typingInput.style.borderColor = "#28a745";
            feedback.innerText = "✅ ზუსტია!";
            feedback.className = "feedback-text text-success";
        } else {
            typingInput.style.borderColor = "#dc3545";
            feedback.innerText = `❌ არასწორია. სწორია: ${currentCorrectAnswer}`;
            feedback.className = "feedback-text text-danger";
        }
        
        document.getElementById("check-typing-btn").classList.add("hidden");
        document.getElementById("next-exercise-btn").classList.remove("hidden");
    });

    document.getElementById("next-exercise-btn").addEventListener("click", () => {
        currentExIndex++;
        document.getElementById("check-typing-btn").classList.remove("hidden");
        loadExercise();
    });

    // ==========================================
    // სიდებარის ღილაკების ფუნქციები
    // ==========================================
    
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

    // ==========================================
    // გავლილი სიტყვების სიის გამოჩენა
    // ==========================================
    
        function renderPassedWords() {
        const listContainer = document.getElementById("passed-words-list");
        const section = document.getElementById("passed-words-section");
        
        if (!listContainer || !section) return; 
        
        listContainer.innerHTML = ""; 
        
        if (currentIndex > 0) {
            // აქ მოვხსენით hidden კლასი და პირდაპირ block-ს ვაძლევთ
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
            
