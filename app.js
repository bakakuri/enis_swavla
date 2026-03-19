let appData = null;
let completedLessons = JSON.parse(localStorage.getItem('completedLessons')) || [];

async function loadData() {
    const response = await fetch('data.json');
    appData = await response.json();
}

function startLearning() {
    const native = document.getElementById('native-lang').value;
    const target = document.getElementById('target-lang').value;
    const courseKey = `${target}_${native}`;

    if (appData.courses[courseKey]) {
        renderCourse(appData.courses[courseKey], courseKey);
        switchScreen('course-screen');
    } else {
        alert("კურსი მზადების პროცესშია.");
    }
}

function renderCourse(levels, courseKey) {
    const container = document.getElementById('course-list');
    container.innerHTML = '';

    levels.forEach((lvl, lIndex) => {
        let levelHtml = `<h2 class="text-xl font-bold mt-8 mb-4 text-cyan-400 border-b border-white/10 pb-2">${lvl.level}</h2>`;
        lvl.lessons.forEach((lesson, sIndex) => {
            const lessonId = `${courseKey}_${lIndex}_${sIndex}`;
            const isDone = completedLessons.includes(lessonId);
            
            levelHtml += `
                <div onclick="showLesson('${lIndex}', '${sIndex}', '${lessonId}')" 
                     class="p-4 mb-3 glass-card rounded-2xl cursor-pointer flex justify-between items-center ${isDone ? 'opacity-60' : ''}">
                    <div>
                        <h3 class="font-medium ${isDone ? 'line-through' : ''}">${lesson.title}</h3>
                        <p class="text-xs text-gray-400 italic">${lesson.content.length} სიტყვა</p>
                    </div>
                    ${isDone ? '<span>✅</span>' : '<span class="text-cyan-500">→</span>'}
                </div>
            `;
        });
        container.innerHTML += levelHtml;
    });
}

function showLesson(lIdx, sIdx, lessonId) {
    const native = document.getElementById('native-lang').value;
    const target = document.getElementById('target-lang').value;
    const lesson = appData.courses[`${target}_${native}`][lIdx].lessons[sIdx];

    const container = document.getElementById('lesson-detail');
    let contentHtml = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">${lesson.title}</h2>
            <button onclick="toggleComplete('${lessonId}')" id="btn-${lessonId}" class="text-xs p-2 rounded-lg bg-white/10">
                ${completedLessons.includes(lessonId) ? 'დასრულებულია' : 'მონიშვნა'}
            </button>
        </div>
    `;

    lesson.content.forEach(item => {
        contentHtml += `
            <div class="word-card mb-4">
                <div class="text-cyan-400 text-xl font-bold">${item.word}</div>
                <div class="text-gray-400 italic text-sm mb-1">[${item.phonetic}]</div>
                <div class="text-white text-lg">${item.translation}</div>
            </div>
        `;
    });

    contentHtml += `
        <div class="mt-8 p-5 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <h4 class="text-indigo-300 font-bold mb-2 text-sm uppercase tracking-widest">გრამატიკის წესი</h4>
            <p class="text-sm leading-relaxed text-gray-200">${lesson.grammar}</p>
        </div>
    `;

    container.innerHTML = contentHtml;
    switchScreen('lesson-screen');
}

function toggleComplete(id) {
    if (completedLessons.includes(id)) {
        completedLessons = completedLessons.filter(i => i !== id);
    } else {
        completedLessons.push(id);
    }
    localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
    startLearning(); // განახლება
}

function switchScreen(screenId) {
    ['setup-screen', 'course-screen', 'lesson-screen'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function backToCourse() { switchScreen('course-screen'); }
function backToSetup() { switchScreen('setup-screen'); }

window.onload = loadData;
