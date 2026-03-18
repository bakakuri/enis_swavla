const words = [
  { en: "Hello", ge: "გამარჯობა" },
  { en: "Car", ge: "მანქანა" },
  { en: "House", ge: "სახლი" }
];

let index = 0;

function nextWord() {
  document.getElementById("word").innerText =
    words[index].en + " - " + words[index].ge;
  index = (index + 1) % words.length;
}
