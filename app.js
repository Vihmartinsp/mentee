let usuario = JSON.parse(localStorage.getItem("usuario"));
let perguntas = [];
let atual = 0;
let pontos = 0;
let acertos = 0;
let erros = 0;
let nivelAtual = "facil";
let acertosSeguidos = 0;
let errosSeguidos = 0;

document.getElementById("infoUsuario").innerHTML =
`Jogador: <strong>${usuario.nome}</strong> | Pontos: <span id="pontos">${pontos}</span>`;

async function carregarPerguntas(){
let res = await fetch("/perguntas");
perguntas = await res.json();
mostrarPergunta();
}

function mostrarPergunta(){

let perguntasFiltradas = perguntas.filter(p=>p.nivel===nivelAtual);

if(atual >= perguntasFiltradas.length){
finalizar();
return;
}

let p = perguntasFiltradas[atual];

let html = `<h3>${p.pergunta}</h3>`;

p.alternativas.forEach((alt,i)=>{
html += `<button onclick="responder(${i})">${alt}</button>`;
});

document.getElementById("quiz").innerHTML = html;

atualizarProgresso();
}

async function responder(indice){

let perguntasFiltradas = perguntas.filter(p=>p.nivel===nivelAtual);
let correta = perguntasFiltradas[atual].correta;

let acertou = indice === correta;

if(acertou){
pontos += 10;
acertos++;
acertosSeguidos++;
errosSeguidos = 0;
}else{
erros++;
errosSeguidos++;
acertosSeguidos = 0;
}

ajustarNivel(acertou);

document.getElementById("pontos").innerText = pontos;

await fetch("/pontos",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({nome:usuario.nome,pontos:acertou?10:0})
});

atual++;
mostrarPergunta();
}

function ajustarNivel(acertou){

if(acertosSeguidos >= 2){
if(nivelAtual==="facil") nivelAtual="medio";
else if(nivelAtual==="medio") nivelAtual="dificil";
acertosSeguidos=0;
}

if(errosSeguidos >= 2){
if(nivelAtual==="dificil") nivelAtual="medio";
else if(nivelAtual==="medio") nivelAtual="facil";
errosSeguidos=0;
}
}

function atualizarProgresso(){
let porcentagem = ((atual+1)/10)*100;
document.getElementById("barra").style.width = porcentagem+"%";
}

function verificarMedalha(){
if(pontos>=50) return "🥇 Ouro";
if(pontos>=30) return "🥈 Prata";
if(pontos>=15) return "🥉 Bronze";
return "🎖 Participação";
}

function finalizar(){

document.getElementById("quiz").innerHTML =
`<h2>Finalizado!</h2>
<p>Medalha: ${verificarMedalha()}</p>`;

criarGrafico();
mostrarRanking();
}

function criarGrafico(){
new Chart(document.getElementById("grafico"),{
type:"doughnut",
data:{
labels:["Acertos","Erros"],
datasets:[{
data:[acertos,erros]
}]
}
});
}

async function mostrarRanking(){
let res = await fetch("/ranking");
let ranking = await res.json();

let html="";
ranking.forEach((u,i)=>{
html+=`<p>${i+1}º ${u.nome} - ${u.pontos} pts - ${u.medalha}</p>`;
});

document.getElementById("ranking").innerHTML = html;
}

carregarPerguntas();