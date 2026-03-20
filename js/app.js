let words=[];
let index=0;
let progress=0;

fetch('data/words.json')
.then(r=>r.json())
.then(data=>{
 words=data;
 update();
 quiz();
});

function update(){
 document.getElementById('word').innerText=words[index].word;
 document.getElementById('translation').innerText=words[index].translation;
}

function next(){
 index=(index+1)%words.length;
 update();
}

function speak(){
 let u=new SpeechSynthesisUtterance(words[index].word);
 u.lang='de-DE';
 speechSynthesis.speak(u);
}

function quiz(){
 let q=words[Math.floor(Math.random()*words.length)];
 document.getElementById('question').innerText=q.word;
 let box=document.getElementById('answers');
 box.innerHTML='';

 let options=[q];
 while(options.length<4){
  let r=words[Math.floor(Math.random()*words.length)];
  if(!options.includes(r)) options.push(r);
 }

 options.sort(()=>Math.random()-0.5);

 options.forEach(opt=>{
  let b=document.createElement('button');
  b.innerText=opt.translation;
  b.onclick=()=>{
    if(opt.translation===q.translation){
      progress+=2;
      updateProgress();
      quiz();
    } else {
      alert('Wrong');
    }
  };
  box.appendChild(b);
 });
}

function updateProgress(){
 document.getElementById('barFill').style.width=progress+'%';
 document.getElementById('percent').innerText=progress+'%';
 localStorage.setItem('progress',progress);
}

function toggleTheme(){
 document.body.classList.toggle('light');
}

window.onload=()=>{
 let saved=localStorage.getItem('progress');
 if(saved){progress=parseInt(saved);updateProgress();}
}
