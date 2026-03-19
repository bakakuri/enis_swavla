let currentLesson = "basic";
let currentIndex = 0;
let score = 0;
let quizIndex = 0;

const lessonSelect = document.getElementById("lesson");
lessonSelect.addEventListener("change", () => {
  currentLesson = lessonSelect.value;
  currentIndex = 0;
  quizIndex = 0;
  score = 0;
  displayFlashcard(getLessonCards()[currentIndex]);
  generateQuizQuestion();
});

function getLessonCards() {
  return germanVocab.filter(word => word.category.toLowerCase() === currentLesson);
}

// Flashcards
function displayFlashcard(card) {
  document.getElementById("flashcard").classList.add("flip");
  setTimeout(() => {
    document.getElementById("front").innerText = card.word;
    document.getElementById("pronunciation").innerText = card.pronunciation;
    document.getElementById("back").innerText = card.translation;
    document.getElementById("flashcard").classList.remove("flip");
  }, 300);

  const lessonCards = getLessonCards();
  const progressPercent = ((currentIndex + 1) / lessonCards.length) * 100;
  document.getElementById("progress-bar").style.width = progressPercent + "%";
  document.getElementById("score-display").innerText = `Score: ${score}`;
}

document.getElementById("nextBtn").addEventListener("click", () => {
  const lessonCards = getLessonCards();
  currentIndex = (currentIndex + 1) % lessonCards.length;
  displayFlashcard(lessonCards[currentIndex]);
});

// Quiz
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function generateQuizQuestion() {
  const lessonCards = getLessonCards();
  const question = lessonCards[quizIndex];
  const options = shuffle([
    question.translation,
    lessonCards[Math.floor(Math.random()*lessonCards.length)].translation,
    lessonCards[Math.floor(Math.random()*lessonCards.length)].translation,
    lessonCards[Math.floor(Math.random()*lessonCards.length)].translation
  ]).slice(0,4);

  document.getElementById("quiz-question").innerText = `Translate: ${question.word}`;
  const quizOptions = document.getElementById("quiz-options");
  quizOptions.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.addEventListener("click", () => checkAnswer(opt, question.translation));
    quizOptions.appendChild(btn);
  });
  document.getElementById("quiz-result").innerText = "";
}

function checkAnswer(selected, correct) {
  if(selected === correct){
    document.getElementById("quiz-result").innerText = "✅ Correct!";
    score++;
  } else {
    document.getElementById("quiz-result").innerText = `❌ Wrong! Correct: ${correct}`;
  }
  document.getElementById("score-display").innerText = `Score: ${score}`;
}

document.getElementById("quiz-nextBtn").addEventListener("click", () => {
  const lessonCards = getLessonCards();
  quizIndex = (quizIndex + 1) % lessonCards.length;
  generateQuizQuestion();
});

// init
displayFlashcard(getLessonCards()[currentIndex]);
generateQuizQuestion();
