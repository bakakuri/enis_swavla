let appData = null;

// მონაცემების წამოღება JSON ფაილიდან
async function loadData() {
    const response = await fetch('data.json');
    appData = await response.json();
}

function startLearning() {
    const native = document.getElementById('native-lang').value;
    const target = document.getElementById('target-lang').value;
    const courseKey = `${target}_${native}`;

    if (appData.courses[courseKey]) {
        renderCourse(appData.courses[courseKey]);
        switchScreen('course-screen');
    } else {
        alert("ეს კურსი ჯერ არ არის დამატებული.");
    }
}

function renderCourse(levels) {
    const container = document.getElementById('course-list');
    container.innerHTML = '';

    levels.forEach((lvl, lIndex) => {
        let levelHtml = `<h2 class="text-xl font-semibold mt-6 mb-2">${lvl.level}</h2>`;
        lvl.lessons.forEach((lesson, sIndex) => {
            levelHtml += `
                <div onclick="showLesson('${lIndex}', '${sIndex}')" class="p-4 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-all border border-white/5 shadow-lg">
                    <h3 class="font-medium">${lesson.title}</h3>
                    <p class="text-xs text-gray-400">დააჭირე დასაწყებად</p>
                </div>
            `;
        });
        container.innerHTML += levelHtml;
    });
}

function showLesson(lIdx, sIdx) {
    const native = document.getElementById('native-lang').value;
    const target = document.getElementById('target-lang').value;
    const lesson = appData.courses[`${target}_${native}`][lIdx].lessons[sIdx];

    const container = document.getElementById('lesson-detail');
    let contentHtml = `<h2 class="text-2xl font-bold mb-6">${lesson.title}</h2>`;

    lesson.content.forEach(item => {
        contentHtml += `
            <div class="mb-6 border-b border-white/10 pb-4">
                <div class="text-cyan-400 text-xl font-bold">${item.word}</div>
                <div class="text-gray-400 italic text-sm">[${item.phonetic}]</div>
                <div class="text-white mt-1 text-lg">${item.translation}</div>
            </div>
        `;
    });

    contentHtml += `
        <div class="mt-8 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
            <h4 class="text-cyan-400 font-bold mb-2">💡 გრამატიკა:</h4>
            <p class="text-sm leading-relaxed">${lesson.grammar}</p>
        </div>
    `;

    container.innerHTML = contentHtml;
    switchScreen('lesson-screen');
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
