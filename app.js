
// Pagination + Search
let currentPage = 1;
const itemsPerPage = 20;
let words = [];

function loadWords(data){
  words = data;
  render();
}

function render(){
  const list = document.getElementById("word-list");
  const search = document.getElementById("search").value.toLowerCase();

  let filtered = words.filter(w => 
    (w.de && w.de.toLowerCase().includes(search)) ||
    (w.ka && w.ka.toLowerCase().includes(search))
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if(currentPage > totalPages) currentPage = 1;

  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(start, start + itemsPerPage);

  list.innerHTML = "";
  pageItems.forEach(w => {
    const div = document.createElement("div");
    div.className = "word-card";
    div.innerHTML = `<b>${w.de}</b> - ${w.ka} <small>${w.category}</small>`;
    list.appendChild(div);
  });

  document.getElementById("pagination").innerText = currentPage + " / " + totalPages;
}

function nextPage(){
  currentPage++;
  render();
}

function prevPage(){
  currentPage--;
  if(currentPage < 1) currentPage = 1;
  render();
}
