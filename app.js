let currentIndex = 0;
let score = 0;
const totalCards = germanVocab.length;

// Flashcards
function displayFlashcard(card) {
  document.getElementById("flashcard").classList.add("flip");
  setTimeout(() => {
    document.getElementById("front").innerText = card.word;
    document.getElementById("pronunciation").innerText = card.pronunciation;
    document.getElementById("back").innerText = card.translation;
    document.getElementById("flashcard").classList.remove("flip");
  }, 300);

  // update progress
  const progressPercent = ((currentIndex + 1) / totalCards) * 100;
  document.getElementById("progress-bar").style.width = progressPercent + "%";
  document.getElementById("score-display").innerText = `Score: ${score}`;
}

function nextCard() {
  currentIndex = (currentIndex + 1) % totalCards;
  displayFlashcard(germanVocab[currentIndex]);
}

document.getElementById("nextBtn").addEventListener("click", nextCard);

// Quiz Mode
let quizIndex = 0;

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function generateQuizQuestion() {
  const question = germanVocab[quizIndex];
  const options = shuffle([
    question.translation,
    germanVocab[Math.floor(Math.random()*totalCards)].translation,
    germanVocab[Math.floor(Math.random()*totalCards)].translation,
    germanVocab[Math.floor(Math.random()*totalCards)].translation
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
  quizIndex = (quizIndex + 1) % totalCards;
  generateQuizQuestion();
});

// init
displayFlashcard(germanVocab[currentIndex]);
generateQuizQuestion();
