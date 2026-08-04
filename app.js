// ============================================
// M.E.N.T.E – APP.JS (progresso por conta)
// ============================================

let usuarioAtual = null;
let perfil = criarPerfilPadrao();
let perguntas = [];
let perguntasFiltradas = [];
let perguntaAtivaIndex = 0;
let filtroStatus = "todas";

function criarPerfilPadrao(base = {}) {
  return {
    nome: base.nome || "Estudante",
    email: base.email || "",
    criadoEm: base.criadoEm || new Date().toISOString(),
    pontos: Number(base.pontos) || 0,
    acertos: Number(base.acertos) || 0,
    erros: Number(base.erros) || 0,
    respondidas: Number(base.respondidas) || 0,
    respostas: base.respostas || {},
    topicos: base.topicos || {}
  };
}

function medalhaPorPontos(pontos) {
  if (pontos >= 100) return "🥇 Ouro";
  if (pontos >= 50) return "🥈 Prata";
  if (pontos >= 20) return "🥉 Bronze";
  return "🎖 Participação";
}

function $(id) {
  return document.getElementById(id);
}

function atualizarHeader() {
  const nome = perfil.nome || usuarioAtual?.displayName || "Estudante";
  const email = perfil.email || usuarioAtual?.email || "";
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";

  if ($("scoreDisplay")) $("scoreDisplay").textContent = `${perfil.pontos} pts`;
  if ($("userAvatar")) $("userAvatar").textContent = inicial;
  if ($("userNameDisplay")) $("userNameDisplay").textContent = nome;
  if ($("dropdownName")) $("dropdownName").textContent = nome;
  if ($("dropdownEmail")) $("dropdownEmail").textContent = email;
  if ($("perfAvatar")) $("perfAvatar").textContent = inicial;
  if ($("perfName")) $("perfName").textContent = nome;
  if ($("perfEmail")) $("perfEmail").textContent = email;
  if ($("perfPontos")) $("perfPontos").textContent = perfil.pontos;
  if ($("perfAcertos")) $("perfAcertos").textContent = perfil.acertos;
  if ($("perfErros")) $("perfErros").textContent = perfil.erros;
  if ($("perfPct")) {
    const total = perfil.acertos + perfil.erros;
    $("perfPct").textContent = total ? `${Math.round((perfil.acertos / total) * 100)}%` : "0%";
  }

  atualizarDesempenhoTopicos();
}

function atualizarDesempenhoTopicos() {
  const el = $("topicPerfList");
  if (!el) return;

  const topicos = Object.entries(perfil.topicos || {});
  if (!topicos.length) {
    el.innerHTML = `<p class="empty-state">Responda algumas questões para ver seu desempenho por tópico.</p>`;
    return;
  }

  el.innerHTML = topicos.map(([topico, stats]) => {
    const total = (stats.acertos || 0) + (stats.erros || 0);
    const pct = total ? Math.round(((stats.acertos || 0) / total) * 100) : 0;
    return `<div class="topic-perf-item">
      <strong>${topico}</strong>
      <span>${stats.acertos || 0}/${total} acertos (${pct}%)</span>
    </div>`;
  }).join("");
}

async function salvarPerfil() {
  if (!usuarioAtual) return;
  const dados = { ...perfil, atualizadoEm: new Date().toISOString(), medalha: medalhaPorPontos(perfil.pontos) };
  await fbDB.collection("usuarios").doc(usuarioAtual.uid).set(dados, { merge: true });
}

async function carregarPerfil(user) {
  const ref = fbDB.collection("usuarios").doc(user.uid);
  const snap = await ref.get();
  perfil = criarPerfilPadrao({
    ...(snap.exists ? snap.data() : {}),
    nome: snap.exists ? (snap.data().nome || user.displayName || user.email) : (user.displayName || user.email),
    email: user.email || ""
  });
  await ref.set(perfil, { merge: true });
  atualizarHeader();
}

async function carregarPerguntas() {
  const res = await fetch("/perguntas");
  perguntas = await res.json();
  popularFiltros();
  renderListaQuestoes();
}

function popularFiltros() {
  preencherSelect("filterArea", [...new Set(perguntas.map(p => p.nivel).filter(Boolean))], "Todas as áreas");
  preencherSelect("filterTopico", [...new Set(perguntas.map(p => p.habilidade).filter(Boolean))], "Todos os tópicos");
  preencherSelect("filterAno", [...new Set(perguntas.map(p => p.ano).filter(Boolean))], "Todos os anos");
}

function preencherSelect(id, valores, label) {
  const select = $(id);
  if (!select) return;
  select.innerHTML = `<option value="">${label}</option>` + valores.map(v => `<option value="${v}">${v}</option>`).join("");
}

function statusQuestao(id) {
  const resposta = perfil.respostas?.[id];
  if (!resposta) return "nao-respondidas";
  return resposta.acertou ? "acertei" : "errei";
}

function aplicarFiltros() {
  const area = $("filterArea")?.value || "";
  const topico = $("filterTopico")?.value || "";
  const ano = $("filterAno")?.value || "";

  perguntasFiltradas = perguntas.filter(p => {
    const porStatus = filtroStatus === "todas" || statusQuestao(p.id) === filtroStatus;
    return porStatus && (!area || p.nivel === area) && (!topico || p.habilidade === topico) && (!ano || String(p.ano) === String(ano));
  });
}

function renderListaQuestoes() {
  aplicarFiltros();
  const area = $("questionListArea");
  if (!area) return;
  if ($("activeQuestionArea")) $("activeQuestionArea").style.display = "none";
  area.style.display = "block";

  if (!perguntasFiltradas.length) {
    area.innerHTML = `<div class="empty-state">Nenhuma questão encontrada com esses filtros.</div>`;
    return;
  }

  area.innerHTML = perguntasFiltradas.map((p, index) => {
    const resposta = perfil.respostas?.[p.id];
    const badge = resposta ? (resposta.acertou ? "✅ Acertei" : "❌ Errei") : "Não respondida";
    return `<div class="question-card" data-index="${index}">
      <div><strong>${p.habilidade || "Matemática"}</strong><p>${p.pergunta}</p></div>
      <span class="q-badge">${p.nivel || "ENEM"}</span>
      <span class="q-badge">${badge}</span>
    </div>`;
  }).join("");

  area.querySelectorAll(".question-card").forEach(card => {
    card.addEventListener("click", () => abrirQuestao(Number(card.dataset.index)));
  });
}

function abrirQuestao(index) {
  perguntaAtivaIndex = index;
  const p = perguntasFiltradas[index];
  if (!p) return;
  $("questionListArea").style.display = "none";
  $("activeQuestionArea").style.display = "block";
  if ($("qvTopic")) $("qvTopic").textContent = p.habilidade || p.nivel || "Questão";
  if ($("qvYear")) $("qvYear").textContent = p.ano || p.nivel || "ENEM";
  if ($("qvCounter")) $("qvCounter").textContent = `${index + 1}/${perguntasFiltradas.length}`;
  if ($("qvText")) $("qvText").textContent = p.pergunta;
  if ($("qvFeedback")) $("qvFeedback").style.display = "none";
  if ($("qvOptions")) {
    $("qvOptions").innerHTML = p.alternativas.map((alt, i) => `<button class="option-btn" data-i="${i}">${alt}</button>`).join("");
    $("qvOptions").querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => responder(Number(btn.dataset.i))));
  }
}

async function responder(indice) {
  const p = perguntasFiltradas[perguntaAtivaIndex];
  if (!p) return;
  const acertou = indice === p.correta;
  const jaRespondida = perfil.respostas?.[p.id];

  if (!jaRespondida) {
    perfil.respondidas += 1;
    if (acertou) { perfil.pontos += 10; perfil.acertos += 1; }
    else perfil.erros += 1;

    const topico = p.habilidade || "Geral";
    perfil.topicos[topico] = perfil.topicos[topico] || { acertos: 0, erros: 0 };
    perfil.topicos[topico][acertou ? "acertos" : "erros"] += 1;
  }

  perfil.respostas[p.id] = { acertou, alternativa: indice, correta: p.correta, respondidaEm: new Date().toISOString() };
  await salvarPerfil();
  atualizarHeader();
  mostrarFeedback(p, acertou, jaRespondida);
}

function mostrarFeedback(p, acertou, jaRespondida) {
  if ($("qvFeedback")) $("qvFeedback").style.display = "block";
  if ($("qvFeedbackHeader")) $("qvFeedbackHeader").textContent = acertou ? "✅ Resposta correta!" : "❌ Ainda não foi dessa vez.";
  if ($("qvFeedbackBody")) $("qvFeedbackBody").textContent = `${p.dica || "Revise a resolução e tente outras questões."}${jaRespondida ? " (Essa questão já tinha sido contabilizada.)" : ""}`;
}

function configurarEventos() {
  $("buscarBtn")?.addEventListener("click", renderListaQuestoes);
  $("backToListBtn")?.addEventListener("click", renderListaQuestoes);
  $("qvNextBtn")?.addEventListener("click", () => abrirQuestao((perguntaAtivaIndex + 1) % perguntasFiltradas.length));
  $("userBtn")?.addEventListener("click", () => $("userDropdown")?.classList.toggle("active"));
  ["sideLogoutBtn", "dropLogoutBtn"].forEach(id => $(id)?.addEventListener("click", e => { e.preventDefault(); fbAuth.signOut(); }));
  document.querySelectorAll(".ftab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filtroStatus = btn.dataset.status;
    renderListaQuestoes();
  }));
}

fbAuth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }
  usuarioAtual = user;
  await carregarPerfil(user);
  await carregarPerguntas();
});

document.addEventListener("DOMContentLoaded", configurarEventos);
