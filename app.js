// ============================================
// M.E.N.T.E – ÁREA DE QUESTÕES
// ============================================

const VISITOR_FREE_LIMIT = 3;

const state = {
  user: null,
  userData: {
    nome: "Visitante",
    email: "",
    pontos: 0,
    acertos: 0,
    erros: 0,
    respondidas: 0,
    respostas: {},
    topicos: {}
  },
  perguntas: [],
  filtradas: [],
  paginaAtual: "questoes",
  statusFiltro: "todas",
  questaoAtual: null,
  respostaSelecionada: null
};

const pageTitles = {
  questoes: "Busca de Questões",
  roteiro: "Roteiro de Estudos",
  modulos: "Módulos de Estudos",
  simulados: "Simulados",
  videoaulas: "Vídeo Aulas",
  desempenho: "Meu Desempenho"
};

const topicAreaMap = {
  Porcentagem: "Aritmética",
  Frações: "Aritmética",
  "Regra de Três": "Aritmética",
  Juros: "Financeira",
  Probabilidade: "Probabilidade",
  Estatística: "Estatística",
  Geometria: "Geometria",
  Área: "Geometria",
  Volume: "Geometria",
  Funções: "Álgebra",
  Equações: "Álgebra",
  Proporção: "Aritmética"
};

const $ = id => document.getElementById(id);
const isLoggedIn = () => Boolean(state.user);

function getInitials(nome = "Visitante") {
  return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "V";
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function showAuthGate(message = "Crie sua conta gratuita para liberar todas as questões, salvar progresso e acompanhar seu desempenho.") {
  const modal = $("authGateModal");
  const text = $("authGateText");
  if (text) text.textContent = message;
  if (modal) modal.classList.add("open");
}

function closeAuthGate() {
  $("authGateModal")?.classList.remove("open");
}

function normalizeQuestion(pergunta, index) {
  const topico = pergunta.habilidade || pergunta.topico || "Matemática";
  return {
    ...pergunta,
    id: pergunta.id || index + 1,
    area: pergunta.area || topicAreaMap[topico] || "Matemática",
    topico,
    ano: pergunta.ano || 2019 + (index % 5),
    alternativas: pergunta.alternativas || [],
    correta: Number(pergunta.correta || 0),
    dica: pergunta.dica || "Revise os dados do enunciado e elimine as alternativas que não fazem sentido.",
    resolucao: pergunta.resolucao || [
      "Leia o enunciado e identifique quais dados foram fornecidos.",
      "Relacione esses dados com o tópico da questão.",
      "Resolva com calma e compare o resultado com as alternativas."
    ]
  };
}

async function carregarPerguntas() {
  try {
    const res = await fetch("perguntas.json");
    state.perguntas = (await res.json()).map(normalizeQuestion);
  } catch (err) {
    state.perguntas = [];
    showToast("Não foi possível carregar as questões agora.");
  }

  popularFiltros();
  aplicarFiltros();
  renderRoteiro();
  renderModulos();
  renderSimulados();
  renderVideoaulas();
  renderPerformance();
}

function popularFiltros() {
  fillSelect("filterArea", "Todas as áreas", [...new Set(state.perguntas.map(q => q.area))]);
  fillSelect("filterTopico", "Todos os tópicos", [...new Set(state.perguntas.map(q => q.topico))]);
  fillSelect("filterAno", "Todos os anos", [...new Set(state.perguntas.map(q => q.ano))].sort());
}

function fillSelect(id, label, values) {
  const select = $(id);
  if (!select) return;
  select.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option value="${v}">${v}</option>`).join("");
}

function aplicarFiltros() {
  const area = $("filterArea")?.value || "";
  const topico = $("filterTopico")?.value || "";
  const ano = $("filterAno")?.value || "";
  const respostas = state.userData.respostas || {};

  state.filtradas = state.perguntas.filter(q => {
    const resposta = respostas[q.id];
    const statusOk =
      state.statusFiltro === "todas" ||
      (state.statusFiltro === "nao-respondidas" && !resposta) ||
      (state.statusFiltro === "acertei" && resposta?.acertou) ||
      (state.statusFiltro === "errei" && resposta && !resposta.acertou);

    return (!area || q.area === area) && (!topico || q.topico === topico) && (!ano || String(q.ano) === ano) && statusOk;
  });

  renderQuestionList();
}

function renderQuestionList() {
  const listArea = $("questionListArea");
  if (!listArea) return;

  $("questionListArea").style.display = "block";
  $("activeQuestionArea").style.display = "none";

  if (!state.filtradas.length) {
    listArea.innerHTML = `<p class="empty-state">Nenhuma questão encontrada com esses filtros.</p>`;
    return;
  }

  const cards = state.filtradas.map((q, index) => {
    const locked = !isLoggedIn() && index >= VISITOR_FREE_LIMIT;
    const answered = state.userData.respostas?.[q.id];
    const statusClass = answered ? (answered.acertou ? "answered-ok" : "answered-err") : "";
    const statusLabel = answered ? (answered.acertou ? "Acertei" : "Errei") : "";

    return `
      <article class="question-card ${locked ? "is-locked" : ""} ${statusClass}">
        ${locked ? `<div class="lock-chip"><i class="fas fa-lock"></i> Conta gratuita</div>` : ""}
        <div class="q-tags">
          <span class="q-badge">${q.area}</span>
          <span class="q-badge q-badge-topic">${q.topico}</span>
          <span class="q-badge q-badge-year">ENEM ${q.ano}</span>
          ${statusLabel ? `<span class="q-status">${statusLabel}</span>` : ""}
        </div>
        <p class="question-preview">${q.pergunta}</p>
        <button class="resolve-link" data-question-id="${q.id}"><i class="fas fa-arrow-right"></i> Resolver</button>
      </article>`;
  }).join("");

  listArea.innerHTML = `
    <p class="result-count">${state.filtradas.length} questão(ões) encontrada(s)</p>
    <div class="question-grid">${cards}</div>
  `;

  listArea.querySelectorAll(".resolve-link").forEach(btn => {
    btn.addEventListener("click", () => abrirQuestao(Number(btn.dataset.questionId)));
  });
}

function abrirQuestao(id) {
  const index = state.filtradas.findIndex(q => q.id === id);
  if (!isLoggedIn() && index >= VISITOR_FREE_LIMIT) {
    showAuthGate("Você já visualizou as questões liberadas para visitantes. Crie sua conta gratuita para acessar todo o banco de questões.");
    return;
  }

  const q = state.perguntas.find(item => item.id === id);
  if (!q) return;

  state.questaoAtual = q;
  state.respostaSelecionada = null;

  $("questionListArea").style.display = "none";
  $("activeQuestionArea").style.display = "block";
  $("qvTopic").textContent = q.topico;
  $("qvYear").textContent = `ENEM ${q.ano}`;
  $("qvCounter").textContent = `Questão ${index + 1} de ${state.filtradas.length}`;
  $("qvText").textContent = q.pergunta;
  $("qvFeedback").style.display = "none";
  $("qvOptions").innerHTML = q.alternativas.map((alt, i) => `
    <button class="option-btn" data-option="${i}">
      <span class="option-letter">${String.fromCharCode(65 + i)}</span>
      <span>${alt}</span>
    </button>
  `).join("");

  $("qvOptions").querySelectorAll(".option-btn").forEach(btn => {
    btn.addEventListener("click", () => responderQuestao(Number(btn.dataset.option)));
  });
}

function responderQuestao(indice) {
  if (!state.questaoAtual) return;
  if (!isLoggedIn()) {
    showAuthGate("Entre ou cadastre-se para responder questões, ganhar pontos e salvar seu progresso automaticamente.");
    return;
  }

  const q = state.questaoAtual;
  const acertou = indice === q.correta;
  const jaRespondida = Boolean(state.userData.respostas?.[q.id]);

  state.userData.respostas = state.userData.respostas || {};
  state.userData.topicos = state.userData.topicos || {};
  state.userData.respostas[q.id] = { resposta: indice, acertou, respondidaEm: new Date().toISOString() };

  if (!jaRespondida) {
    state.userData.respondidas = (state.userData.respondidas || 0) + 1;
    state.userData.pontos = (state.userData.pontos || 0) + (acertou ? 10 : 0);
    state.userData.acertos = (state.userData.acertos || 0) + (acertou ? 1 : 0);
    state.userData.erros = (state.userData.erros || 0) + (acertou ? 0 : 1);

    const topico = state.userData.topicos[q.topico] || { acertos: 0, erros: 0 };
    topico.acertos += acertou ? 1 : 0;
    topico.erros += acertou ? 0 : 1;
    state.userData.topicos[q.topico] = topico;
  }

  $("qvOptions").querySelectorAll(".option-btn").forEach(btn => {
    const option = Number(btn.dataset.option);
    btn.disabled = true;
    if (option === q.correta) btn.classList.add("correct");
    if (option === indice && !acertou) btn.classList.add("wrong");
  });

  $("qvFeedback").style.display = "block";
  $("qvFeedbackHeader").innerHTML = acertou
    ? `<i class="fas fa-check-circle"></i> Muito bem, você acertou!`
    : `<i class="fas fa-times-circle"></i> Ainda não foi dessa vez.`;
  $("qvFeedbackHeader").className = `feedback-header ${acertou ? "ok" : "err"}`;
  $("qvFeedbackBody").textContent = q.dica;
  $("qvStepsSection").style.display = "block";
  $("qvStepsList").innerHTML = q.resolucao.map((step, i) => `<div class="step-item"><strong>${i + 1}</strong><span>${step}</span></div>`).join("");

  updateUserUI();
  renderPerformance();
  salvarDadosUsuario();
}

function salvarDadosUsuario() {
  if (!isLoggedIn() || typeof fbDB === "undefined") return;
  fbDB.collection("usuarios").doc(state.user.uid).set({
    nome: state.userData.nome,
    email: state.userData.email,
    pontos: state.userData.pontos || 0,
    acertos: state.userData.acertos || 0,
    erros: state.userData.erros || 0,
    respondidas: state.userData.respondidas || 0,
    respostas: state.userData.respostas || {},
    topicos: state.userData.topicos || {},
    atualizadoEm: new Date().toISOString()
  }, { merge: true }).catch(() => showToast("Não foi possível salvar seu progresso agora."));
}

function updateUserUI() {
  const nome = state.userData.nome || "Visitante";
  const email = state.userData.email || "Entre para salvar seu progresso";
  const avatar = getInitials(nome);
  const pontos = state.userData.pontos || 0;

  $("scoreDisplay").textContent = `${pontos} pts`;
  $("userAvatar").textContent = avatar;
  $("userNameDisplay").textContent = nome.split(" ")[0] || nome;
  $("dropdownName").textContent = nome;
  $("dropdownEmail").textContent = email;

  const logoutLabel = isLoggedIn() ? "Sair" : "Entrar / Criar conta";
  $("sideLogoutBtn").innerHTML = `<i class="fas ${isLoggedIn() ? "fa-sign-out-alt" : "fa-lock"}"></i><span>${logoutLabel}</span>`;
  $("dropLogoutBtn").innerHTML = `<i class="fas ${isLoggedIn() ? "fa-sign-out-alt" : "fa-lock"}"></i> ${logoutLabel}`;
}

function renderPerformance() {
  const total = (state.userData.acertos || 0) + (state.userData.erros || 0);
  const pct = total ? Math.round(((state.userData.acertos || 0) / total) * 100) : 0;

  $("perfAvatar").textContent = getInitials(state.userData.nome);
  $("perfName").textContent = state.userData.nome || "Visitante";
  $("perfEmail").textContent = state.userData.email || "Crie uma conta para salvar estes dados";
  $("perfPontos").textContent = state.userData.pontos || 0;
  $("perfAcertos").textContent = state.userData.acertos || 0;
  $("perfErros").textContent = state.userData.erros || 0;
  $("perfPct").textContent = `${pct}%`;

  const topicos = state.userData.topicos || {};
  $("topicPerfList").innerHTML = Object.keys(topicos).length
    ? Object.entries(topicos).map(([nome, dados]) => {
        const totalTopico = dados.acertos + dados.erros;
        const pctTopico = totalTopico ? Math.round((dados.acertos / totalTopico) * 100) : 0;
        return `<div class="topic-row"><span>${nome}</span><strong>${pctTopico}%</strong><small>${dados.acertos} acertos · ${dados.erros} erros</small></div>`;
      }).join("")
    : `<p class="empty-state small">Responda questões para acompanhar sua evolução por tópico.</p>`;
}

function renderRoteiro() {
  $("roteiroContent").innerHTML = ["Fundamentos", "Álgebra", "Geometria", "Simulado final"].map((title, i) => `
    <div class="content-card ${!isLoggedIn() && i > 0 ? "locked-content" : ""}">
      <div class="content-card-icon"><i class="fas ${i > 0 && !isLoggedIn() ? "fa-lock" : "fa-check"}"></i></div>
      <div><h3>Semana ${i + 1}: ${title}</h3><p>${i > 0 && !isLoggedIn() ? "Crie sua conta para liberar o roteiro completo." : "Conteúdo guiado com metas e prática."}</p></div>
    </div>
  `).join("");
}

function renderModulos() {
  const topicos = [...new Set(state.perguntas.map(q => q.topico))].slice(0, 8);
  $("modulosContent").innerHTML = `<div class="module-grid">${topicos.map((topico, i) => `
    <button class="module-card ${!isLoggedIn() && i >= 2 ? "locked-content" : ""}" data-lock="${!isLoggedIn() && i >= 2}">
      <i class="fas ${!isLoggedIn() && i >= 2 ? "fa-lock" : "fa-book"}"></i>
      <strong>${topico}</strong>
      <span>${state.perguntas.filter(q => q.topico === topico).length} questões</span>
    </button>
  `).join("")}</div>`;
}

function renderSimulados() {
  $("simuladosContent").innerHTML = `
    <div class="content-card">
      <div class="content-card-icon"><i class="fas fa-stopwatch"></i></div>
      <div><h3>Simulado rápido</h3><p>10 questões aleatórias para treinar ritmo de prova.</p></div>
      <button class="btn-buscar" id="startSimuladoBtn">Começar</button>
    </div>`;
  $("startSimuladoBtn")?.addEventListener("click", () => {
    if (!isLoggedIn()) showAuthGate("Cadastre-se para fazer simulados e registrar sua pontuação.");
    else showToast("Simulado em breve! Continue treinando pela busca de questões.");
  });
}

function renderVideoaulas() {
  $("videoContent").innerHTML = `
    <div class="module-grid">
      <div class="module-card"><i class="fas fa-play-circle"></i><strong>Porcentagem</strong><span>Aula recomendada</span></div>
      <div class="module-card"><i class="fas fa-play-circle"></i><strong>Geometria</strong><span>Aula recomendada</span></div>
      <div class="module-card locked-content"><i class="fas fa-lock"></i><strong>Trilhas completas</strong><span>Disponível para contas gratuitas</span></div>
    </div>`;
}

function switchPage(page) {
  if (!isLoggedIn() && page !== "questoes") {
    showAuthGate("Esta área é liberada para contas gratuitas. Cadastre-se para acessar roteiros, módulos, simulados e desempenho.");
    return;
  }

  state.paginaAtual = page;
  document.querySelectorAll(".page").forEach(el => {
    el.style.display = "none";
    el.classList.remove("active");
  });
  const pageEl = $(`page${page.charAt(0).toUpperCase() + page.slice(1)}`);
  if (pageEl) {
    pageEl.style.display = "block";
    pageEl.classList.add("active");
  }

  document.querySelectorAll(".snav-item[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  $("topbarTitle").textContent = pageTitles[page] || "M.E.N.T.E";
  $("shellSidebar")?.classList.remove("open");
}

function bindEvents() {
  $("buscarBtn")?.addEventListener("click", aplicarFiltros);
  ["filterArea", "filterTopico", "filterAno"].forEach(id => $(id)?.addEventListener("change", aplicarFiltros));
  $("backToListBtn")?.addEventListener("click", renderQuestionList);
  $("qvNextBtn")?.addEventListener("click", () => {
    const currentIndex = state.filtradas.findIndex(q => q.id === state.questaoAtual?.id);
    const next = state.filtradas[currentIndex + 1];
    if (next) abrirQuestao(next.id);
    else renderQuestionList();
  });

  document.querySelectorAll(".ftab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ftab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.statusFiltro = btn.dataset.status;
      aplicarFiltros();
    });
  });

  document.querySelectorAll(".snav-item[data-page], .dd-item[data-page]").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      switchPage(item.dataset.page);
      $("userDropdown")?.classList.remove("open");
    });
  });

  $("userBtn")?.addEventListener("click", () => $("userDropdown")?.classList.toggle("open"));
  $("sideToggle")?.addEventListener("click", () => $("shellSidebar")?.classList.toggle("open"));
  $("authGateClose")?.addEventListener("click", closeAuthGate);
  $("authGateLater")?.addEventListener("click", closeAuthGate);
  $("authGateSignup")?.addEventListener("click", () => { window.location.href = "auth.html"; });

  ["sideLogoutBtn", "dropLogoutBtn"].forEach(id => $(id)?.addEventListener("click", e => {
    e.preventDefault();
    if (!isLoggedIn()) {
      window.location.href = "auth.html";
      return;
    }
    fbAuth.signOut().then(() => window.location.href = "index.html");
  }));
}

function initAuthState() {
  if (typeof fbAuth === "undefined") {
    updateUserUI();
    carregarPerguntas();
    return;
  }

  fbAuth.onAuthStateChanged(async user => {
    state.user = user;
    if (user) {
      state.userData = {
        ...state.userData,
        nome: user.displayName || user.email?.split("@")[0] || "Estudante",
        email: user.email || ""
      };

      try {
        const doc = await fbDB.collection("usuarios").doc(user.uid).get();
        if (doc.exists) state.userData = { ...state.userData, ...doc.data() };
      } catch (err) {
        showToast("Não foi possível carregar todos os seus dados salvos.");
      }
    } else {
      state.userData = {
        nome: "Visitante",
        email: "Entre para salvar seu progresso",
        pontos: 0,
        acertos: 0,
        erros: 0,
        respondidas: 0,
        respostas: {},
        topicos: {}
      };
    }

    updateUserUI();
    await carregarPerguntas();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initAuthState();
});
