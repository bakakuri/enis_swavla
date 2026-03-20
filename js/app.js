let words=[],i=0,progress=0;

fetch('data/words.json').then(r=>r.json()).then(d=>{
words=d;
load();
quiz();
});

function load(){
document.getElementById('word').innerText=words[i].word;
document.getElementById('translation').innerText=words[i].translation;
}

function next(){
i=(i+1)%words.length;
load();
}

function speak(){
speechSynthesis.speak(new SpeechSynthesisUtterance(words[i].word));
}

function quiz(){
let q=words[Math.floor(Math.random()*words.length)];
document.getElementById('question').innerText=q.word;
let box=document.getElementById('answers');
box.innerHTML='';
let opts=[q,...words.sort(()=>0.5-Math.random()).slice(0,3)];
opts=opts.sort(()=>0.5-Math.random());

opts.forEach(o=>{
let b=document.createElement('button');
b.innerText=o.translation;
b.onclick=()=>{
if(o.translation===q.translation){
progress+=10;
update();
quiz();
}else{
b.style.background='red';
}
};
box.appendChild(b);
});
}

function update(){
document.getElementById('fill').style.width=progress+'%';
document.getElementById('percent').innerText=progress+'%';
}

function toggleTheme(){
document.body.classList.toggle('light');
}
