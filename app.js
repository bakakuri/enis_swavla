let currentIndex = 0;
const totalCards = germanVocab.length;

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
}

function nextCard() {
  currentIndex = (currentIndex + 1) % totalCards;
  displayFlashcard(germanVocab[currentIndex]);
}

// init
displayFlashcard(germanVocab[currentIndex]);

document.getElementById("nextBtn").addEventListener("click", nextCard);
