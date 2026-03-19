let currentIndex = 0;

function displayFlashcard(card) {
  document.getElementById("front").innerText = card.word;
  document.getElementById("pronunciation").innerText = card.pronunciation;
  document.getElementById("back").innerText = card.translation;
}

function nextCard() {
  currentIndex = (currentIndex + 1) % germanVocab.length;
  displayFlashcard(germanVocab[currentIndex]);
}

// init
displayFlashcard(germanVocab[currentIndex]);

document.getElementById("nextBtn").addEventListener("click", nextCard);
