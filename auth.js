// ============================================
// MENTE – AUTH.JS  (Firebase Auth + Firestore)
// ============================================

// ---------- utilitários de UI ----------
function switchTab(aba) {
  const isLogin = aba === "login";
  document.getElementById("formLogin").style.display    = isLogin ? "block" : "none";
  document.getElementById("formCadastro").style.display = isLogin ? "none"  : "block";
  document.getElementById("tabLogin").classList.toggle("active",  isLogin);
  document.getElementById("tabCadastro").classList.toggle("active", !isLogin);
  limparErros();
}

function limparErros() {
  ["loginError", "cadError"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"; el.textContent = ""; }
  });
}

function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") { input.type = "text";     btn.textContent = "🙈"; }
  else                           { input.type = "password"; btn.textContent = "👁"; }
}

// ---------- traduz erros do Firebase ----------
function traduzErro(code) {
  const map = {
    "auth/user-not-found":       "E-mail não encontrado.",
    "auth/wrong-password":       "Senha incorreta.",
    "auth/email-already-in-use": "E-mail já cadastrado.",
    "auth/weak-password":        "Senha muito fraca (mínimo 6 caracteres).",
    "auth/invalid-email":        "E-mail inválido.",
    "auth/too-many-requests":    "Muitas tentativas. Tente novamente mais tarde.",
    "auth/invalid-credential":   "E-mail ou senha incorretos."
  };
  return map[code] || "Ocorreu um erro. Tente novamente.";
}

// ---------- Login ----------
function fazerLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;
  limparErros();

  if (!email || !senha) return mostrarErro("loginError", "Preencha todos os campos.");

  const btn = document.querySelector("#formLogin .btn-auth");
  btn.textContent = "Entrando…";
  btn.disabled = true;

  fbAuth.signInWithEmailAndPassword(email, senha)
    .then(() => { window.location.href = "inicial.html"; })
    .catch(err => {
      mostrarErro("loginError", traduzErro(err.code));
      btn.textContent = "Entrar";
      btn.disabled = false;
    });
}

// ---------- Cadastro ----------
function fazerCadastro() {
  const nome   = document.getElementById("cadNome").value.trim();
  const email  = document.getElementById("cadEmail").value.trim();
  const senha  = document.getElementById("cadSenha").value;
  const senha2 = document.getElementById("cadSenha2").value;
  limparErros();

  if (!nome || !email || !senha || !senha2)
    return mostrarErro("cadError", "Preencha todos os campos.");
  if (nome.length < 3)
    return mostrarErro("cadError", "Nome muito curto (mínimo 3 caracteres).");
  if (!/\S+@\S+\.\S+/.test(email))
    return mostrarErro("cadError", "E-mail inválido.");
  if (senha.length < 6)
    return mostrarErro("cadError", "A senha deve ter ao menos 6 caracteres.");
  if (senha !== senha2)
    return mostrarErro("cadError", "As senhas não coincidem.");

  const btn = document.querySelector("#formCadastro .btn-auth");
  btn.textContent = "Criando conta…";
  btn.disabled = true;

  fbAuth.createUserWithEmailAndPassword(email, senha)
    .then(cred => {
      const uid = cred.user.uid;
      return fbDB.collection("usuarios").doc(uid).set({
        nome,
        email,
        criadoEm:    new Date().toISOString(),
        pontos:      0,
        acertos:     0,
        erros:       0,
        respondidas: 0
      });
    })
    .then(() => {
      // Atualiza displayName no Firebase Auth
      return fbAuth.currentUser.updateProfile({ displayName: nome });
    })
    .then(() => { window.location.href = "inicial.html"; })
    .catch(err => {
      mostrarErro("cadError", traduzErro(err.code));
      btn.textContent = "Criar minha conta";
      btn.disabled = false;
    });
}

// ---------- Salvar progresso no Firestore ----------
function salvarProgresso(dados) {
  const user = fbAuth.currentUser;
  if (!user) return;
  fbDB.collection("usuarios").doc(user.uid).update(dados).catch(() => {});
}

// ---------- Carregar progresso do Firestore ----------
function carregarProgresso(uid, callback) {
  fbDB.collection("usuarios").doc(uid).get()
    .then(doc => { if (doc.exists) callback(doc.data()); })
    .catch(() => {});
}

// ---------- Init da página auth.html (só roda lá) ----------
document.addEventListener("DOMContentLoaded", () => {
  const naAuthPage = !!document.getElementById("formLogin");
  if (!naAuthPage) return;

  // Enter nos campos
  document.getElementById("loginSenha")?.addEventListener("keydown",
    e => { if (e.key === "Enter") fazerLogin(); });
  document.getElementById("cadSenha2")?.addEventListener("keydown",
    e => { if (e.key === "Enter") fazerCadastro(); });

  // Se já está logado, vai direto pra inicial
  fbAuth.onAuthStateChanged(user => {
    if (user) window.location.href = "inicial.html";
  });
});
