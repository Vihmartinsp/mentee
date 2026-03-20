const state = {
  perguntas: [],
  filteredQuestions: [],
  currentQuestionIndex: -1,
  currentFilterStatus: 'todas',
  user: null,
  progress: {
    pontos: 0,
    acertos: 0,
    erros: 0,
    respondidas: 0,
    respostas: {}
  }
};

const roteiros = [
  {
    semana: 'Semana 1',
    foco: 'Base matemática e interpretação',
    itens: ['Porcentagem e razão', 'Média aritmética', 'Leitura estratégica do enunciado']
  },
  {
    semana: 'Semana 2',
    foco: 'Álgebra e funções',
    itens: ['Equações simples', 'Função do 1º grau', 'Função quadrática']
  },
  {
    semana: 'Semana 3',
    foco: 'Geometria, medidas e probabilidade',
    itens: ['Área de figuras planas', 'Grandezas e medidas', 'Probabilidade básica']
  },
  {
    semana: 'Semana 4',
    foco: 'Revisão e treino em ritmo de prova',
    itens: ['Simulado rápido', 'Correção comentada', 'Mapeamento dos pontos fracos']
  }
];

const modulosBase = [
  {
    titulo: 'Porcentagem na prática',
    descricao: 'Aprenda a calcular descontos, aumentos e juros sem decorar fórmulas soltas.',
    topicos: ['Desconto percentual', 'Aumento percentual', 'Porcentagem composta']
  },
  {
    titulo: 'Funções do ENEM',
    descricao: 'Entenda como identificar padrões, gráficos e relações entre grandezas.',
    topicos: ['Função afim', 'Função quadrática', 'Leitura de gráfico']
  },
  {
    titulo: 'Geometria essencial',
    descricao: 'Revise áreas, perímetros e interpretação geométrica com foco em questões.',
    topicos: ['Quadrados e retângulos', 'Triângulos', 'Medidas de superfície']
  }
];

const videoaulas = [
  {
    titulo: 'Porcentagem sem sofrimento',
    canal: 'Matemática Rio',
    descricao: 'Ótimo para destravar contas básicas e aplicações em problemas do dia a dia.'
  },
  {
    titulo: 'Função do 1º grau para o ENEM',
    canal: 'Ferretto Matemática',
    descricao: 'Revisão rápida para interpretar tabelas, gráficos e relações lineares.'
  },
  {
    titulo: 'Probabilidade básica',
    canal: 'Professor Angela Matemática',
    descricao: 'Resumo objetivo para questões simples e médias sobre eventos aleatórios.'
  }
];

function byId(id) {
  return document.getElementById(id);
}

function getStoredProgressKey(user) {
  return user?.uid ? `mentee_progress_${user.uid}` : 'mentee_progress_guest';
}

function normalizeQuestion(raw, index) {
  const habilidade = raw.habilidade || 'Matemática';
  const area = habilidade.includes('Competência')
    ? 'Competências ENEM'
    : habilidade.split(' - ')[0];
  const topico = habilidade.includes(' - ')
    ? habilidade.split(' - ').slice(1).join(' - ')
    : habilidade;
  const ano = 2020 + (index % 5);

  return {
    ...raw,
    area,
    topico,
    ano,
    explicacao: raw.dica || 'Analise os dados do enunciado e relacione com a habilidade principal da questão.',
    passos: [
      `Identifique a habilidade central: ${habilidade}.`,
      'Separe os valores importantes do enunciado antes de calcular.',
      `Use a dica: ${raw.dica || 'faça a relação matemática principal da questão'}.`,
      `Confira a alternativa correta: ${raw.alternativas?.[raw.correta] || 'não informada'}.`
    ]
  };
}

function loadProgress() {
  try {
    const saved = localStorage.getItem(getStoredProgressKey(state.user));
    if (!saved) return;
    const parsed = JSON.parse(saved);
    state.progress = {
      pontos: parsed.pontos || 0,
      acertos: parsed.acertos || 0,
      erros: parsed.erros || 0,
      respondidas: parsed.respondidas || 0,
      respostas: parsed.respostas || {}
    };
  } catch (_) {
    state.progress = { pontos: 0, acertos: 0, erros: 0, respondidas: 0, respostas: {} };
  }
}

function saveProgress() {
  localStorage.setItem(getStoredProgressKey(state.user), JSON.stringify(state.progress));

  if (typeof salvarProgresso === 'function' && state.user?.uid) {
    salvarProgresso({
      pontos: state.progress.pontos,
      acertos: state.progress.acertos,
      erros: state.progress.erros,
      respondidas: state.progress.respondidas,
      respostas: state.progress.respostas,
      atualizadoEm: new Date().toISOString()
    });
  }
}

function updateUserUI() {
  const fallbackName = state.user?.displayName || state.user?.email?.split('@')[0] || 'Visitante';
  const fallbackEmail = state.user?.email || 'modo visitante';
  const avatar = fallbackName.charAt(0).toUpperCase();

  ['userAvatar', 'perfAvatar'].forEach(id => {
    const el = byId(id);
    if (el) el.textContent = avatar;
  });

  if (byId('userNameDisplay')) byId('userNameDisplay').textContent = fallbackName;
  if (byId('dropdownName')) byId('dropdownName').textContent = fallbackName;
  if (byId('dropdownEmail')) byId('dropdownEmail').textContent = fallbackEmail;
  if (byId('perfName')) byId('perfName').textContent = fallbackName;
  if (byId('perfEmail')) byId('perfEmail').textContent = fallbackEmail;
}

function updateScoreDisplays() {
  if (byId('scoreDisplay')) byId('scoreDisplay').textContent = `${state.progress.pontos} pts`;
  if (byId('perfPontos')) byId('perfPontos').textContent = state.progress.pontos;
  if (byId('perfAcertos')) byId('perfAcertos').textContent = state.progress.acertos;
  if (byId('perfErros')) byId('perfErros').textContent = state.progress.erros;

  const total = state.progress.acertos + state.progress.erros;
  const pct = total ? Math.round((state.progress.acertos / total) * 100) : 0;
  if (byId('perfPct')) byId('perfPct').textContent = `${pct}%`;
}

function getQuestionStatus(questionId) {
  const resposta = state.progress.respostas[questionId];
  if (!resposta) return 'nao-respondidas';
  return resposta.correta ? 'acertei' : 'errei';
}

function populateFilters() {
  const areas = [...new Set(state.perguntas.map(q => q.area))].sort();
  const topicos = [...new Set(state.perguntas.map(q => q.topico))].sort();
  const anos = [...new Set(state.perguntas.map(q => q.ano))].sort((a, b) => b - a);

  const mappings = [
    ['filterArea', areas],
    ['filterTopico', topicos],
    ['filterAno', anos]
  ];

  mappings.forEach(([id, values]) => {
    const select = byId(id);
    if (!select) return;
    const defaultOption = select.querySelector('option')?.outerHTML || '';
    select.innerHTML = defaultOption + values.map(v => `<option value="${v}">${v}</option>`).join('');
  });
}

function applyFilters() {
  const area = byId('filterArea')?.value || '';
  const topico = byId('filterTopico')?.value || '';
  const ano = byId('filterAno')?.value || '';

  state.filteredQuestions = state.perguntas.filter(q => {
    const matchesArea = !area || q.area === area;
    const matchesTopico = !topico || q.topico === topico;
    const matchesAno = !ano || String(q.ano) === String(ano);
    const status = state.currentFilterStatus;
    const matchesStatus = status === 'todas' || getQuestionStatus(q.id) === status;
    return matchesArea && matchesTopico && matchesAno && matchesStatus;
  });

  renderQuestionList();
}

function renderQuestionList() {
  const container = byId('questionListArea');
  const activeQuestionArea = byId('activeQuestionArea');
  if (!container || !activeQuestionArea) return;

  activeQuestionArea.style.display = 'none';

  if (!state.filteredQuestions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Nenhuma questão encontrada</h3>
        <p>Altere os filtros ou volte para “Todas” para explorar mais questões.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="question-grid">
      ${state.filteredQuestions.map((q, index) => {
        const status = getQuestionStatus(q.id);
        const statusLabel = {
          'nao-respondidas': 'Não respondida',
          'acertei': 'Você acertou',
          'errei': 'Você errou'
        }[status];

        return `
          <article class="question-card">
            <div class="question-card-top">
              <span class="q-badge">${q.area}</span>
              <span class="q-badge q-badge-year">${q.ano}</span>
            </div>
            <h3>${q.topico}</h3>
            <p>${q.pergunta}</p>
            <div class="question-card-footer">
              <span class="status-pill status-${status}">${statusLabel}</span>
              <button class="btn-card-action" data-question-index="${index}">Responder</button>
            </div>
          </article>`;
      }).join('')}
    </div>`;

  container.querySelectorAll('[data-question-index]').forEach(button => {
    button.addEventListener('click', () => openQuestion(Number(button.dataset.questionIndex)));
  });
}

function openQuestion(index) {
  const question = state.filteredQuestions[index];
  if (!question) return;

  state.currentQuestionIndex = index;
  byId('questionListArea').innerHTML = '';
  byId('activeQuestionArea').style.display = 'block';
  byId('qvTopic').textContent = question.topico;
  byId('qvYear').textContent = question.ano;
  byId('qvCounter').textContent = `Questão ${index + 1} de ${state.filteredQuestions.length}`;
  byId('qvText').textContent = question.pergunta;

  const savedAnswer = state.progress.respostas[question.id];
  const options = byId('qvOptions');
  options.innerHTML = question.alternativas.map((alt, altIndex) => {
    const isCorrect = altIndex === question.correta;
    const wasSelected = savedAnswer?.selecionada === altIndex;
    const classes = ['option-btn'];

    if (savedAnswer) {
      if (wasSelected && savedAnswer.correta) classes.push('option-correct');
      if (wasSelected && !savedAnswer.correta) classes.push('option-wrong');
      if (isCorrect) classes.push('option-reveal');
    }

    return `<button class="${classes.join(' ')}" data-alt-index="${altIndex}" ${savedAnswer ? 'disabled' : ''}>${String.fromCharCode(65 + altIndex)}) ${alt}</button>`;
  }).join('');

  options.querySelectorAll('[data-alt-index]').forEach(button => {
    button.addEventListener('click', () => answerCurrentQuestion(Number(button.dataset.altIndex)));
  });

  const feedback = byId('qvFeedback');
  feedback.style.display = savedAnswer ? 'block' : 'none';
  if (savedAnswer) {
    renderFeedback(question, savedAnswer.correta);
  }
}

function answerCurrentQuestion(selectedIndex) {
  const question = state.filteredQuestions[state.currentQuestionIndex];
  if (!question || state.progress.respostas[question.id]) return;

  const correta = selectedIndex === question.correta;
  state.progress.respostas[question.id] = {
    selecionada: selectedIndex,
    correta,
    topico: question.topico
  };
  state.progress.respondidas += 1;

  if (correta) {
    state.progress.pontos += 10;
    state.progress.acertos += 1;
  } else {
    state.progress.erros += 1;
  }

  saveProgress();
  updateScoreDisplays();
  openQuestion(state.currentQuestionIndex);
  renderTopicPerformance();
}

function renderFeedback(question, correta) {
  const header = byId('qvFeedbackHeader');
  const body = byId('qvFeedbackBody');
  const section = byId('qvStepsSection');
  const list = byId('qvStepsList');
  const toggle = byId('qvShowStepsBtn');

  header.innerHTML = correta
    ? '<span>✅ Resposta correta!</span><small>Você somou 10 pontos.</small>'
    : '<span>❌ Resposta incorreta</span><small>Veja a resolução guiada abaixo.</small>';

  body.innerHTML = `
    <p><strong>Explicação:</strong> ${question.explicacao}</p>
    <p><strong>Alternativa correta:</strong> ${question.alternativas[question.correta]}</p>`;

  list.innerHTML = question.passos.map((passo, i) => `<div class="step-item"><span>${i + 1}</span><p>${passo}</p></div>`).join('');
  section.style.display = 'block';
  list.classList.remove('expanded');
  toggle.textContent = 'Ver resolução completa ↓';
  toggle.onclick = () => {
    list.classList.toggle('expanded');
    const expanded = list.classList.contains('expanded');
    toggle.textContent = expanded ? 'Ocultar resolução ↑' : 'Ver resolução completa ↓';
  };

  byId('qvFeedback').style.display = 'block';
}

function goToNextQuestion() {
  const nextIndex = state.currentQuestionIndex + 1;
  if (nextIndex < state.filteredQuestions.length) {
    openQuestion(nextIndex);
  } else {
    byId('activeQuestionArea').style.display = 'none';
    renderQuestionList();
    showToast('Você concluiu as questões filtradas!');
  }
}

function renderRoteiro() {
  const el = byId('roteiroContent');
  if (!el) return;

  el.innerHTML = `
    <div class="info-grid">
      ${roteiros.map(item => `
        <article class="info-card">
          <span class="info-kicker">${item.semana}</span>
          <h3>${item.foco}</h3>
          <ul>${item.itens.map(topico => `<li>${topico}</li>`).join('')}</ul>
        </article>`).join('')}
    </div>`;
}

function renderModulos() {
  const el = byId('modulosContent');
  if (!el) return;

  const topicosMaisCobrados = [...new Set(state.perguntas.slice(0, 6).map(q => q.topico))];
  const modulos = [...modulosBase, {
    titulo: 'Tópicos mais cobrados no seu banco',
    descricao: 'Conteúdo dinâmico montado a partir das questões já cadastradas no projeto.',
    topicos: topicosMaisCobrados
  }];

  el.innerHTML = `
    <div class="info-grid">
      ${modulos.map(modulo => `
        <article class="info-card">
          <h3>${modulo.titulo}</h3>
          <p>${modulo.descricao}</p>
          <div class="tag-row">${modulo.topicos.map(topico => `<span class="mini-tag">${topico}</span>`).join('')}</div>
        </article>`).join('')}
    </div>`;
}

function renderSimulados() {
  const el = byId('simuladosContent');
  if (!el) return;

  const faceis = state.perguntas.filter(q => q.nivel === 'facil').length;
  const medios = state.perguntas.filter(q => q.nivel === 'medio').length;
  const dificeis = state.perguntas.filter(q => q.nivel === 'dificil').length;

  el.innerHTML = `
    <div class="simulado-card">
      <h3>Simulado inteligente</h3>
      <p>Monte uma prática rápida com o banco atual de questões e acompanhe seu desempenho por nível.</p>
      <div class="simulado-stats">
        <div><strong>${faceis}</strong><span>Fáceis</span></div>
        <div><strong>${medios}</strong><span>Médias</span></div>
        <div><strong>${dificeis}</strong><span>Difíceis</span></div>
      </div>
      <button class="btn-primary-inline" id="startSimuladoBtn">Iniciar com 5 questões</button>
    </div>`;

  byId('startSimuladoBtn')?.addEventListener('click', () => {
    const sorted = [...state.perguntas].sort(() => Math.random() - 0.5).slice(0, 5);
    const simulado = byId('simuladoAtivo');
    simulado.style.display = 'block';
    simulado.innerHTML = `
      <div class="simulado-card compact">
        <h4>Questões sugeridas para agora</h4>
        <ol>${sorted.map(q => `<li>${q.topico} — ${q.pergunta}</li>`).join('')}</ol>
        <p class="muted">Dica: use a página “Busca de Questões” para responder essas questões com feedback completo.</p>
      </div>`;
  });
}

function renderVideoaulas() {
  const el = byId('videoContent');
  if (!el) return;

  el.innerHTML = `
    <div class="info-grid">
      ${videoaulas.map(video => `
        <article class="info-card video-card">
          <div class="video-thumb"><i class="fas fa-play"></i></div>
          <h3>${video.titulo}</h3>
          <p>${video.descricao}</p>
          <span class="mini-tag">${video.canal}</span>
        </article>`).join('')}
    </div>`;
}

function renderTopicPerformance() {
  const el = byId('topicPerfList');
  if (!el) return;

  const counters = {};
  state.perguntas.forEach(question => {
    const answer = state.progress.respostas[question.id];
    if (!answer) return;
    if (!counters[question.topico]) counters[question.topico] = { acertos: 0, erros: 0 };
    if (answer.correta) counters[question.topico].acertos += 1;
    else counters[question.topico].erros += 1;
  });

  const entries = Object.entries(counters).sort((a, b) => (b[1].acertos + b[1].erros) - (a[1].acertos + a[1].erros));

  if (!entries.length) {
    el.innerHTML = '<p class="muted">Responda algumas questões para visualizar seu desempenho por tópico.</p>';
    return;
  }

  el.innerHTML = entries.map(([topico, values]) => {
    const total = values.acertos + values.erros;
    const pct = Math.round((values.acertos / total) * 100);
    return `
      <div class="topic-perf-item">
        <div>
          <strong>${topico}</strong>
          <p>${values.acertos} acertos · ${values.erros} erros</p>
        </div>
        <span>${pct}%</span>
      </div>`;
  }).join('');
}

function showPage(page) {
  const pages = {
    questoes: 'pageQuestoes',
    roteiro: 'pageRoteiro',
    modulos: 'pageModulos',
    simulados: 'pageSimulados',
    videoaulas: 'pageVideoaulas',
    desempenho: 'pageDesempenho'
  };

  Object.values(pages).forEach(id => {
    const el = byId(id);
    if (!el) return;
    const active = id === pages[page];
    el.style.display = active ? 'block' : 'none';
    el.classList.toggle('active', active);
  });

  document.querySelectorAll('.snav-item[data-page], .dd-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  const titles = {
    questoes: 'Busca de Questões',
    roteiro: 'Roteiro de Estudos',
    modulos: 'Módulos de Estudos',
    simulados: 'Simulados',
    videoaulas: 'Vídeo Aulas',
    desempenho: 'Meu Desempenho'
  };

  if (byId('topbarTitle')) byId('topbarTitle').textContent = titles[page] || 'M.E.N.T.E';
}

function showToast(message) {
  const toast = byId('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

function setupShellInteractions() {
  document.querySelectorAll('.snav-item[data-page], .dd-item[data-page]').forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      const page = item.dataset.page;
      showPage(page);
      byId('userDropdown')?.classList.remove('show');
      if (window.innerWidth < 960) byId('shellSidebar')?.classList.remove('open');
    });
  });

  document.querySelectorAll('#filterTabs .ftab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.currentFilterStatus = tab.dataset.status;
      document.querySelectorAll('#filterTabs .ftab').forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      applyFilters();
    });
  });

  byId('buscarBtn')?.addEventListener('click', applyFilters);
  byId('backToListBtn')?.addEventListener('click', renderQuestionList);
  byId('qvNextBtn')?.addEventListener('click', goToNextQuestion);
  byId('sideToggle')?.addEventListener('click', () => byId('shellSidebar')?.classList.toggle('open'));
  byId('userBtn')?.addEventListener('click', () => byId('userDropdown')?.classList.toggle('show'));
  document.addEventListener('click', event => {
    const wrap = byId('userWrap');
    if (wrap && !wrap.contains(event.target)) byId('userDropdown')?.classList.remove('show');
  });

  const logoutHandler = async event => {
    event.preventDefault();
    try {
      if (typeof fbAuth !== 'undefined' && fbAuth.currentUser) {
        await fbAuth.signOut();
      }
    } catch (_) {
      // ignora erro de logout para fallback local
    }

    state.user = null;
    loadProgress();
    updateUserUI();
    updateScoreDisplays();
    renderTopicPerformance();
    showToast('Sessão encerrada. Você continua em modo visitante.');
    window.location.href = 'index.html';
  };

  byId('sideLogoutBtn')?.addEventListener('click', logoutHandler);
  byId('dropLogoutBtn')?.addEventListener('click', logoutHandler);
}

async function fetchQuestions() {
  const response = await fetch('/perguntas');
  if (!response.ok) throw new Error('Não foi possível carregar as perguntas.');
  const data = await response.json();
  state.perguntas = data.map(normalizeQuestion);
}

function syncFirebaseUser() {
  if (typeof fbAuth === 'undefined') {
    state.user = null;
    loadProgress();
    updateUserUI();
    updateScoreDisplays();
    renderTopicPerformance();
    return;
  }

  fbAuth.onAuthStateChanged(user => {
    state.user = user;
    updateUserUI();
    loadProgress();
    updateScoreDisplays();
    renderTopicPerformance();

    if (user && typeof carregarProgresso === 'function') {
      carregarProgresso(user.uid, dados => {
        state.progress = {
          pontos: dados.pontos || 0,
          acertos: dados.acertos || 0,
          erros: dados.erros || 0,
          respondidas: dados.respondidas || 0,
          respostas: dados.respostas || {}
        };
        saveProgress();
        updateScoreDisplays();
        renderTopicPerformance();
        applyFilters();
      });
    }
  });
}

async function init() {
  try {
    setupShellInteractions();
    syncFirebaseUser();
    await fetchQuestions();
    populateFilters();
    renderRoteiro();
    renderModulos();
    renderSimulados();
    renderVideoaulas();
    updateUserUI();
    updateScoreDisplays();
    renderTopicPerformance();
    applyFilters();
    showPage('questoes');
  } catch (error) {
    const container = byId('questionListArea');
    if (container) {
      container.innerHTML = `
        <div class="empty-state error-state">
          <h3>Erro ao carregar o site</h3>
          <p>${error.message}</p>
        </div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
