// ... წინა კოდის საწყისი (loadData, renderHome) ...

function openLesson(title) {
    const lesson = findLesson(title);
    const container = document.getElementById('app');
    
    let html = `
        <div class="top-nav">
            <button onclick="renderHome()" style="background:none; border:none; color:var(--accent); cursor:pointer;">← უკან</button>
            <div class="progress-track"><div class="progress-fill" style="width: 50%"></div></div>
        </div>
        <div class="p-5">
            <h2 class="text-2xl font-bold mb-6">${lesson.title}</h2>
    `;

    lesson.words.forEach((item, idx) => {
        // დინამიური ქვიზის ვარიანტების მომზადება
        const options = generateOptions(item.t);

        html += `
            <div class="card">
                <div class="word-title">${item.w}</div>
                <div class="phonetic mb-2">[${item.p}]</div>
                <div class="text-gray-400 text-sm mb-4">"${item.e}"</div>
                
                <div class="quiz-area pt-4 border-t border-white/5">
                    <p class="text-xs text-gray-500 uppercase font-bold mb-2">ამოიცანი თარგმანი:</p>
                    <div class="grid grid-cols-1 gap-2">
                        ${options.map(opt => `
                            <button onclick="checkAnswer(this, '${opt}', '${item.t}')" class="btn-choice">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html + `</div>`;
}

// ფუნქცია, რომელიც პოულობს არასწორ პასუხებს ბაზიდან
function generateOptions(correct) {
    let allTranslations = [];
    appData.courses.de_ka[0].topics.forEach(t => 
        t.lessons.forEach(l => 
            l.words.forEach(w => allTranslations.push(w.t))
        )
    );
    
    // აირჩიე 2 შემთხვევითი არასწორი პასუხი
    let wrongs = allTranslations.filter(t => t !== correct)
                                .sort(() => 0.5 - Math.random())
                                .slice(0, 2);
    
    return [correct, ...wrongs].sort(() => 0.5 - Math.random());
}

function checkAnswer(btn, selected, correct) {
    if(selected === correct) {
        btn.classList.add('correct');
        // ხმოვანი ეფექტი ან ვიბრაცია აქ
    } else {
        btn.classList.add('wrong');
    }
}
